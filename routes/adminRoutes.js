const express = require('express');
const router = express.Router();
const db = require('../data/db');
const { ensureAdmin } = require('../middleware/auth');

// GET /admin
router.get('/admin', ensureAdmin, (req, res) => {
  const orders = db.getOrders();
  const pizzas = db.getPizzas();
  const users = db.getUsers();

  const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
  const pendingOrders = orders.filter(o => o.status !== 'delivered');

  res.render('admin', {
    pageTitle: 'Store Manager Dashboard - Domino\'s Pizza',
    orders,
    pizzasCount: pizzas.length,
    usersCount: users.length,
    totalRevenue,
    pendingCount: pendingOrders.length,
    successMsg: req.query.msg || null
  });
});

// POST /admin/orders/:orderId/status
router.post('/admin/orders/:orderId/status', ensureAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['order_placed', 'preparing', 'baking', 'quality_check', 'out_for_delivery', 'delivered'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const updatedOrder = db.updateOrderStatus(req.params.orderId, status);
  if (!updatedOrder) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({ success: true, order: updatedOrder });
  }

  res.redirect('/admin?msg=Order status updated successfully');
});

// POST /admin/orders/:orderId/simulate-next (Advances status to the next stage)
router.post('/admin/orders/:orderId/simulate-next', (req, res) => {
  // Allows testing simulation even without admin credentials for demo convenience!
  const order = db.getOrderById(req.params.orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const sequence = ['order_placed', 'preparing', 'baking', 'quality_check', 'out_for_delivery', 'delivered'];
  const currentIdx = sequence.indexOf(order.status);
  const nextStatus = currentIdx < sequence.length - 1 ? sequence[currentIdx + 1] : sequence[0];

  const updated = db.updateOrderStatus(order.id, nextStatus);
  res.json({ success: true, nextStatus, order: updated });
});

// POST /admin/salesforce/sync-all
router.post('/admin/salesforce/sync-all', async (req, res) => {
  const salesforceService = require('../services/salesforceService');
  const users = db.getUsers();
  const orders = db.getOrders();

  const results = {
    customersAttempted: users.length,
    ordersAttempted: orders.length,
    customerResults: [],
    orderResults: []
  };

  for (const user of users) {
    const r = await salesforceService.syncCustomer(user);
    results.customerResults.push({ id: user.id, email: user.email, ...r });
  }

  for (const order of orders) {
    const r = await salesforceService.syncOrder(order);
    results.orderResults.push({ id: order.id, ...r });
  }

  res.json({ success: true, message: 'Salesforce sync executed', ...results });
});

module.exports = router;
