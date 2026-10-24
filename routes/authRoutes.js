const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../data/db');
const { ensureAuth, guestOnly } = require('../middleware/auth');

// GET /login
router.get('/login', guestOnly, (req, res) => {
  const redirect = req.query.redirect || '';
  const msg = req.query.msg || '';
  res.render('login', {
    pageTitle: 'Sign In - Domino\'s Pizza',
    redirect,
    error: msg || null
  });
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password, redirect } = req.body;
  const isAjax = req.xhr || req.headers.accept?.includes('application/json');

  if (!email || !password) {
    if (isAjax) {
      return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }
    return res.render('login', {
      pageTitle: 'Sign In - Domino\'s Pizza',
      redirect,
      error: 'Please enter both email and password.'
    });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    if (isAjax) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    return res.render('login', {
      pageTitle: 'Sign In - Domino\'s Pizza',
      redirect,
      error: 'Invalid email or password.'
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    if (isAjax) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    return res.render('login', {
      pageTitle: 'Sign In - Domino\'s Pizza',
      redirect,
      error: 'Invalid email or password.'
    });
  }

  // Set session
  req.session.userId = user.id;

  if (isAjax) {
    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  }

  const destination = redirect || req.session.returnTo || '/menu';
  delete req.session.returnTo;
  res.redirect(destination);
});

// GET /register
router.get('/register', guestOnly, (req, res) => {
  const redirect = req.query.redirect || '';
  res.render('register', {
    pageTitle: 'Create Account - Domino\'s Pizza',
    redirect,
    error: null
  });
});

// POST /register
router.post('/register', async (req, res) => {
  const { name, email, phone, password, confirmPassword, redirect } = req.body;
  const isAjax = req.xhr || req.headers.accept?.includes('application/json');

  if (!name || !email || !phone || !password) {
    const msg = 'Please fill in all required fields.';
    if (isAjax) return res.status(400).json({ success: false, message: msg });
    return res.render('register', { pageTitle: 'Create Account - Domino\'s Pizza', redirect, error: msg });
  }

  if (password.length < 6) {
    const msg = 'Password must be at least 6 characters long.';
    if (isAjax) return res.status(400).json({ success: false, message: msg });
    return res.render('register', { pageTitle: 'Create Account - Domino\'s Pizza', redirect, error: msg });
  }

  if (confirmPassword && password !== confirmPassword) {
    const msg = 'Passwords do not match.';
    if (isAjax) return res.status(400).json({ success: false, message: msg });
    return res.render('register', { pageTitle: 'Create Account - Domino\'s Pizza', redirect, error: msg });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    const msg = 'An account with this email already exists. Please log in.';
    if (isAjax) return res.status(400).json({ success: false, message: msg });
    return res.render('register', { pageTitle: 'Create Account - Domino\'s Pizza', redirect, error: msg });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = db.createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    password: hashedPassword,
    role: 'user',
    addresses: []
  });

  req.session.userId = newUser.id;

  if (isAjax) {
    return res.json({
      success: true,
      message: `Account created successfully! Welcome, ${newUser.name}!`,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  }

  const destination = redirect || req.session.returnTo || '/menu';
  delete req.session.returnTo;
  res.redirect(destination);
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login?msg=You have been safely logged out.');
  });
});

// GET /profile
router.get('/profile', ensureAuth, (req, res) => {
  const userOrders = db.getOrdersByUserId(req.user.id);
  res.render('profile', {
    pageTitle: 'My Profile - Domino\'s Pizza',
    ordersCount: userOrders.length,
    recentOrders: userOrders.slice(0, 3),
    successMsg: req.query.updated ? 'Profile updated successfully!' : null
  });
});

// POST /profile/address
router.post('/profile/address', ensureAuth, (req, res) => {
  const { flat, area, city, pincode, type } = req.body;
  const addresses = req.user.addresses || [];
  
  addresses.push({
    id: 'addr-' + Date.now(),
    type: type || 'Home',
    flat,
    area,
    city: city || 'Bengaluru',
    pincode
  });

  db.updateUser(req.user.id, { addresses });
  
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({ success: true, addresses });
  }
  res.redirect('/profile?updated=1');
});

module.exports = router;
