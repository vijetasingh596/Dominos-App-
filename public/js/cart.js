// Domino's Cart & Pizza Customization Manager

const CART_STORAGE_KEY = 'dominos_cart_items';
const COUPON_STORAGE_KEY = 'dominos_active_coupon';

let cartItems = [];
let activeCoupon = localStorage.getItem(COUPON_STORAGE_KEY) || '';

// Load initial cart
try {
  cartItems = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
} catch (e) {
  cartItems = [];
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderCartDrawer();

  // Cart Drawer open/close listeners
  const cartBtn = document.getElementById('open-cart-btn');
  const closeBtn = document.getElementById('close-cart-btn');
  const overlay = document.getElementById('cart-drawer-overlay');

  if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
  if (overlay) overlay.addEventListener('click', closeCartDrawer);

  // Apply Coupon button
  const applyCouponBtn = document.getElementById('btn-apply-coupon');
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', handleApplyCoupon);
  }

  // Checkout button
  const checkoutBtn = document.getElementById('btn-cart-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleProceedToCheckout);
  }
});

function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartDrawer();
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  updateCartBadge();
}

function updateCartBadge() {
  const count = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const badge = document.getElementById('cart-badge-count');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Add Item Directly or with customization
function addToCart(pizzaId, size = 'regular', crustId = null, extraCheese = false) {
  const existingIdx = cartItems.findIndex(i => 
    i.id === pizzaId && i.size === size && i.crustId === crustId && !!i.extraCheese === !!extraCheese
  );

  if (existingIdx > -1) {
    cartItems[existingIdx].quantity += 1;
  } else {
    cartItems.push({
      id: pizzaId,
      size,
      crustId,
      extraCheese: !!extraCheese,
      quantity: 1
    });
  }

  saveCart();
  renderCartDrawer();
  openCartDrawer();
  showToast('Added to your Domino\'s cart! 🍕', 'success');
}

function updateQuantity(index, delta) {
  if (cartItems[index]) {
    cartItems[index].quantity += delta;
    if (cartItems[index].quantity <= 0) {
      cartItems.splice(index, 1);
      showToast('Item removed from cart', 'info');
    }
    saveCart();
    renderCartDrawer();
  }
}

// Render the slide-in drawer
async function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const footer = document.getElementById('cart-drawer-footer');
  if (!container) return;

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <div class="icon">🍕</div>
        <h3>Your Cart is Empty</h3>
        <p>Good food is always cooking! Go ahead, order some hot & fresh pizzas from the menu.</p>
        <a href="/menu" class="btn-dominos-red" style="margin-top: 1.25rem; font-size: 0.9rem;" onclick="closeCartDrawer()">Explore Menu</a>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = 'flex';

  // Request price calculations from server
  try {
    const res = await fetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems, couponCode: activeCoupon })
    });
    const data = await res.json();

    if (!data.success && data.items.length === 0) {
      container.innerHTML = `<div class="cart-empty-state"><h3>Your Cart is Empty</h3></div>`;
      if (footer) footer.style.display = 'none';
      return;
    }

    // Render items
    container.innerHTML = data.items.map((item, idx) => `
      <div class="cart-item-card">
        <img src="${item.image}" alt="${item.name}" class="cart-item-thumb">
        <div class="cart-item-details">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="food-type-icon ${item.isVeg ? 'veg' : 'nonveg'}" style="position: static; width: 14px; height: 14px;"></span>
            <div class="cart-item-name">${item.name}</div>
          </div>
          <div class="cart-item-specs">
            ${item.sizeName} | ${item.crustName} ${item.extraCheese ? ' | +Extra Cheese' : ''}
          </div>
          <div class="cart-item-bottom">
            <div class="cart-item-price">₹${item.itemTotal}</div>
            <div class="qty-stepper">
              <button class="qty-btn" onclick="updateQuantity(${idx}, -1)">-</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn" onclick="updateQuantity(${idx}, 1)">+</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Update Bill Details
    const subtotalEl = document.getElementById('bill-subtotal');
    const discountRow = document.getElementById('bill-discount-row');
    const discountEl = document.getElementById('bill-discount');
    const deliveryEl = document.getElementById('bill-delivery');
    const gstEl = document.getElementById('bill-gst');
    const totalEl = document.getElementById('bill-grand-total');
    const couponInput = document.getElementById('coupon-input');

    if (subtotalEl) subtotalEl.textContent = `₹${data.subtotal}`;
    if (deliveryEl) deliveryEl.textContent = data.deliveryFee === 0 ? 'FREE' : `₹${data.deliveryFee}`;
    if (gstEl) gstEl.textContent = `₹${data.gst}`;
    if (totalEl) totalEl.textContent = `₹${data.grandTotal}`;

    if (discountRow && discountEl) {
      if (data.discount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-₹${data.discount}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (couponInput && activeCoupon) {
      couponInput.value = activeCoupon;
    }

  } catch (err) {
    console.error('Error calculating cart:', err);
  }
}

// Handle Coupon
function handleApplyCoupon() {
  const input = document.getElementById('coupon-input');
  const code = (input ? input.value : '').trim().toUpperCase();
  if (!code) {
    activeCoupon = '';
    localStorage.removeItem(COUPON_STORAGE_KEY);
    renderCartDrawer();
    showToast('Coupon removed', 'info');
    return;
  }
  activeCoupon = code;
  localStorage.setItem(COUPON_STORAGE_KEY, code);
  renderCartDrawer();
  showToast(`Applied coupon ${code}! Checking discount...`, 'success');
}

// Proceed to Checkout - STRICT AUTH CHECK RULE
function handleProceedToCheckout() {
  if (cartItems.length === 0) {
    showToast('Your cart is empty!', 'info');
    return;
  }

  // Check if user is logged in
  if (!window.DOMINOS_USER) {
    // User is NOT logged in: Enforce rule by opening Auth Modal
    closeCartDrawer();
    openAuthModal('Please sign in or create an account to complete your Domino\'s order.');
    return;
  }

  // User is logged in: Proceed to checkout
  window.location.href = '/checkout';
}

// ================= Customization Modal Manager =================
let currentCustomPizza = null;
let selectedSize = 'medium';
let selectedCrust = 'hand-tossed';
let extraCheeseChecked = false;

async function openCustomizeModal(pizzaId) {
  try {
    const res = await fetch(`/api/pizzas/${pizzaId}`);
    const data = await res.json();
    if (!data.success) return;

    currentCustomPizza = data.pizza;
    selectedSize = currentCustomPizza.defaultSize || 'medium';
    selectedCrust = currentCustomPizza.crusts?.[0]?.id || 'hand-tossed';
    extraCheeseChecked = false;

    renderCustomModalUI();

    const backdrop = document.getElementById('customize-modal-backdrop');
    if (backdrop) {
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  } catch (err) {
    console.error('Failed to load pizza details:', err);
  }
}

function closeCustomizeModal() {
  const backdrop = document.getElementById('customize-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function renderCustomModalUI() {
  if (!currentCustomPizza) return;

  const titleEl = document.getElementById('modal-pizza-title');
  const imgEl = document.getElementById('modal-pizza-img');
  const descEl = document.getElementById('modal-pizza-desc');
  const sizeGrid = document.getElementById('modal-size-grid');
  const crustList = document.getElementById('modal-crust-list');
  const extraCheeseCheckbox = document.getElementById('modal-extra-cheese-cb');

  if (titleEl) titleEl.textContent = currentCustomPizza.name;
  if (imgEl) imgEl.src = currentCustomPizza.image;
  if (descEl) descEl.textContent = currentCustomPizza.tagline || currentCustomPizza.description;

  // Render sizes
  if (sizeGrid && currentCustomPizza.sizes) {
    sizeGrid.innerHTML = Object.entries(currentCustomPizza.sizes).map(([key, sz]) => `
      <div class="size-option-card ${selectedSize === key ? 'selected' : ''}" onclick="selectSize('${key}')">
        <div class="size-name">${sz.name}</div>
        <div class="size-serves">${sz.serves || ''}</div>
        <div class="size-price">₹${sz.price}</div>
      </div>
    `).join('');
  }

  // Render crusts
  if (crustList) {
    if (currentCustomPizza.crusts && currentCustomPizza.crusts.length > 0) {
      crustList.innerHTML = currentCustomPizza.crusts.map(c => `
        <div class="crust-row-option ${selectedCrust === c.id ? 'selected' : ''}" onclick="selectCrust('${c.id}')">
          <div class="crust-info-name">${c.name}</div>
          <div class="crust-extra-tag">${c.extraPrice > 0 ? `+ ₹${c.extraPrice}` : 'Included'}</div>
        </div>
      `).join('');
    } else {
      crustList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.88rem;">Standard Crust</div>`;
    }
  }

  if (extraCheeseCheckbox) {
    extraCheeseCheckbox.checked = extraCheeseChecked;
  }

  updateModalTotal();
}

function selectSize(sizeKey) {
  selectedSize = sizeKey;
  renderCustomModalUI();
}

function selectCrust(crustId) {
  selectedCrust = crustId;
  renderCustomModalUI();
}

function toggleExtraCheese(e) {
  extraCheeseChecked = e.target.checked;
  updateModalTotal();
}

function updateModalTotal() {
  if (!currentCustomPizza) return;
  const sizeData = currentCustomPizza.sizes[selectedSize] || Object.values(currentCustomPizza.sizes)[0];
  let total = sizeData ? sizeData.price : 0;

  if (currentCustomPizza.crusts) {
    const crust = currentCustomPizza.crusts.find(c => c.id === selectedCrust);
    if (crust) total += (crust.extraPrice || 0);
  }

  if (extraCheeseChecked) total += 49;

  const totalEl = document.getElementById('modal-calculated-total');
  if (totalEl) totalEl.textContent = `₹${total}`;
}

function confirmAddCustomPizza() {
  if (!currentCustomPizza) return;
  addToCart(currentCustomPizza.id, selectedSize, selectedCrust, extraCheeseChecked);
  closeCustomizeModal();
}
