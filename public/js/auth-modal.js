// Fast In-Page Authentication Modal & Tab Switcher

let activeAuthTab = 'login'; // 'login' or 'register'

function openAuthModal(noticeMessage = '') {
  const backdrop = document.getElementById('auth-modal-backdrop');
  const noticeEl = document.getElementById('auth-modal-notice');
  
  if (noticeEl) {
    if (noticeMessage) {
      noticeEl.textContent = noticeMessage;
      noticeEl.style.display = 'block';
    } else {
      noticeEl.style.display = 'none';
    }
  }

  if (backdrop) {
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeAuthModal() {
  const backdrop = document.getElementById('auth-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function switchAuthTab(tab) {
  activeAuthTab = tab;
  const loginForm = document.getElementById('auth-login-form');
  const registerForm = document.getElementById('auth-register-form');
  const tabLoginBtn = document.getElementById('tab-btn-login');
  const tabRegBtn = document.getElementById('tab-btn-register');

  if (tab === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (tabLoginBtn) tabLoginBtn.classList.add('active');
    if (tabRegBtn) tabRegBtn.classList.remove('active');
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (tabLoginBtn) tabLoginBtn.classList.remove('active');
    if (tabRegBtn) tabRegBtn.classList.add('active');
  }
}

// Fast AJAX Login
async function submitAjaxLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value;
  const password = form.password.value;
  const errorEl = document.getElementById('auth-login-error');

  if (errorEl) errorEl.style.display = 'none';

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!data.success) {
      if (errorEl) {
        errorEl.textContent = data.message || 'Login failed';
        errorEl.style.display = 'block';
      }
      return;
    }

    // Success! Update global state
    window.DOMINOS_USER = data.user;
    showToast(data.message || 'Signed in successfully!', 'success');
    closeAuthModal();

    // If redirected from checkout attempt, proceed to checkout
    setTimeout(() => {
      window.location.href = '/checkout';
    }, 400);

  } catch (err) {
    console.error('Login error:', err);
  }
}

// Fast AJAX Register
async function submitAjaxRegister(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value;
  const email = form.email.value;
  const phone = form.phone.value;
  const password = form.password.value;
  const errorEl = document.getElementById('auth-register-error');

  if (errorEl) errorEl.style.display = 'none';

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ name, email, phone, password })
    });
    const data = await res.json();

    if (!data.success) {
      if (errorEl) {
        errorEl.textContent = data.message || 'Registration failed';
        errorEl.style.display = 'block';
      }
      return;
    }

    // Success! Update global state
    window.DOMINOS_USER = data.user;
    showToast(`Welcome to Domino's, ${data.user.name}! 🍕`, 'success');
    closeAuthModal();

    setTimeout(() => {
      window.location.href = '/checkout';
    }, 400);

  } catch (err) {
    console.error('Registration error:', err);
  }
}

// 1-Click Demo Fill
function quickDemoLogin() {
  const form = document.getElementById('auth-login-form');
  if (form) {
    form.email.value = 'demo@dominos.com';
    form.password.value = 'password123';
    form.dispatchEvent(new Event('submit'));
  }
}
