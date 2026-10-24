const express = require('express');
const router = express.Router();
const db = require('../data/db');
const { ensureAuth } = require('../middleware/auth');

// Helper to calculate cart totals
function calculateOrderTotals(items, couponCode) {
  let subtotal = 0;
  
  const detailedItems = items.map(item => {
    const pizza = db.getPizzaById(item.id);
    if (!pizza) return null;
    
    const sizeKey = item.size || pizza.defaultSize || 'regular';
    const sizeData = pizza.sizes[sizeKey] || Object.values(pizza.sizes)[0];
    const basePrice = sizeData ? sizeData.price : 0;
    
    // Crust price
    let crustPrice = 0;
    let crustName = 'Standard Crust';
    if (item.crustId && pizza.crusts) {
      const crust = pizza.crusts.find(c => c.id === item.crustId);
      if (crust) {
        crustPrice = crust.extraPrice || 0;
        crustName = crust.name;
      }
    }
    
    // Extra cheese
    const extraCheesePrice = item.extraCheese ? 49 : 0;
    
    const unitPrice = basePrice + crustPrice + extraCheesePrice;
    const qty = parseInt(item.quantity) || 1;
    const itemTotal = unitPrice * qty;
    
    subtotal += itemTotal;
    
    return {
      id: pizza.id,
      name: pizza.name,
      image: pizza.image,
      isVeg: pizza.isVeg,
      size: sizeKey,
      sizeName: sizeData ? sizeData.name : sizeKey,
      crustId: item.crustId || null,
      crustName,
      extraCheese: !!item.extraCheese,
      quantity: qty,
      unitPrice,
      itemTotal
    };
  }).filter(Boolean);

  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = db.getCouponByCode(couponCode);
    if (coupon) {
      if (subtotal >= coupon.minOrder) {
        if (coupon.discountPercent) {
          discount = Math.min((subtotal * coupon.discountPercent) / 100, coupon.maxDiscount || Infinity);
        } else if (coupon.flatDiscount) {
          discount = coupon.flatDiscount;
        }
        appliedCoupon = {
          code: coupon.code,
          description: coupon.description,
          discountAmount: Math.round(discount)
        };
      }
    }
  }

  const deliveryFee = subtotal > 0 ? (subtotal > 400 ? 0 : 35) : 0;
  const gst = Math.round((subtotal - discount) * 0.05); // 5% GST
  const grandTotal = Math.max(0, Math.round(subtotal - discount + deliveryFee + gst));

  return {
    items: detailedItems,
    subtotal,
    discount: Math.round(discount),
    appliedCoupon,
    deliveryFee,
    gst,
    grandTotal
  };
}

// POST /api/cart/calculate
router.post('/api/cart/calculate', (req, res) => {
  const { items, couponCode } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({
      items: [],
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      gst: 0,
      grandTotal: 0
    });
  }

  const totals = calculateOrderTotals(items, couponCode);
  res.json({ success: true, ...totals });
});

// GET /checkout (STRICT AUTH GUARD)
router.get('/checkout', ensureAuth, (req, res) => {
  res.render('checkout', {
    pageTitle: 'Checkout - Domino\'s Pizza',
    user: req.user,
    coupons: db.getCoupons()
  });
});

// POST /api/orders/place (STRICT AUTH GUARD)
router.post('/api/orders/place', ensureAuth, (req, res) => {
  const { items, couponCode, address, paymentMethod, instructions } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Your cart is empty. Please add items before placing an order.' });
  }

  if (!address || !address.flat || !address.area || !address.pincode || !address.phone) {
    return res.status(400).json({ success: false, message: 'Please provide a complete delivery address with phone number.' });
  }

  const orderCalculations = calculateOrderTotals(items, couponCode);
  if (orderCalculations.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid items in cart.' });
  }

  const newOrder = db.createOrder({
    userId: req.user.id,
    customerName: req.user.name,
    customerEmail: req.user.email,
    customerPhone: address.phone || req.user.phone,
    address: {
      flat: address.flat,
      area: address.area,
      city: address.city || 'Bengaluru',
      pincode: address.pincode,
      landmark: address.landmark || ''
    },
    items: orderCalculations.items,
    pricing: {
      subtotal: orderCalculations.subtotal,
      discount: orderCalculations.discount,
      deliveryFee: orderCalculations.deliveryFee,
      gst: orderCalculations.gst,
      grandTotal: orderCalculations.grandTotal,
      couponCode: orderCalculations.appliedCoupon ? orderCalculations.appliedCoupon.code : null
    },
    paymentMethod: paymentMethod || 'cod', // cod, upi, card
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
    instructions: instructions || 'Ring the bell and leave at the door if contactless.'
  });

  // Save address to user's profile if requested or if not existing
  const addresses = req.user.addresses || [];
  const exists = addresses.some(a => a.flat === address.flat && a.pincode === address.pincode);
  if (!exists) {
    addresses.push({
      id: 'addr-' + Date.now(),
      type: address.type || 'Home',
      flat: address.flat,
      area: address.area,
      city: address.city || 'Bengaluru',
      pincode: address.pincode
    });
    db.updateUser(req.user.id, { addresses });
  }

  res.json({
    success: true,
    message: 'Order placed successfully!',
    orderId: newOrder.id,
    redirectUrl: `/orders/track/${newOrder.id}`
  });
});

// GET /orders/track/:orderId
router.get('/orders/track/:orderId', (req, res) => {
  const order = db.getOrderById(req.params.orderId);
  if (!order) {
    return res.status(404).render('404', {
      pageTitle: 'Order Not Found',
      message: `Could not find order ID ${req.params.orderId}`
    });
  }

  res.render('order-tracker', {
    pageTitle: `Track Order #${order.id} - Domino's Pizza`,
    order
  });
});

// GET /api/orders/:orderId/status
router.get('/api/orders/:orderId/status', (req, res) => {
  const order = db.getOrderById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({
    success: true,
    status: order.status,
    statusHistory: order.statusHistory,
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
    deliveryAgent: order.deliveryAgent
  });
});

// GET /orders (STRICT AUTH GUARD)
router.get('/orders', ensureAuth, (req, res) => {
  const userOrders = db.getOrdersByUserId(req.user.id);
  res.render('orders', {
    pageTitle: 'My Orders - Domino\'s Pizza',
    orders: userOrders
  });
});

module.exports = router;
