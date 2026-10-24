const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { setUserLocals } = require('./middleware/auth');
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dominos_secret_super_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Set user locals on all views
app.use(setUserLocals);

// Flash-like message helper
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  next();
});

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', orderRoutes);
app.use('/', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found - Domino\'s Pizza',
    message: 'The page or pizza you are looking for has been eaten or does not exist.'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).render('404', {
    pageTitle: 'Server Error - Domino\'s Pizza',
    message: 'An unexpected error occurred while preparing your pizza order.'
  });
});

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🍕 Domino's Pizza Web Application Running!`);
  console.log(`📍 Open in browser: http://localhost:${PORT}`);
  console.log(`👤 Demo User: demo@dominos.com / password123`);
  console.log(`👑 Store Admin: admin@dominos.com / admin123`);
  console.log(`===============================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use by another running process.`);
  } else {
    console.error('Server error:', err);
  }
});

module.exports = app;
