const db = require('../data/db');

// Attach user to req and res.locals for EJS views
function setUserLocals(req, res, next) {
  if (req.session && req.session.userId) {
    const user = db.getUserById(req.session.userId);
    if (user) {
      req.user = user;
      res.locals.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses || []
      };
      res.locals.isLoggedIn = true;
      res.locals.isAdmin = user.role === 'admin';
      return next();
    }
  }
  req.user = null;
  res.locals.user = null;
  res.locals.isLoggedIn = false;
  res.locals.isAdmin = false;
  next();
}

// Ensure user is authenticated before proceeding
function ensureAuth(req, res, next) {
  if (req.user) {
    return next();
  }

  // If API or AJAX request
  if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      requireAuth: true,
      message: 'Authentication required. Please log in or sign up to place your Domino\'s order.'
    });
  }

  // Web page request: save intended destination
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login?msg=Please log in to proceed with your order');
}

// Ensure only guests can access login/register
function guestOnly(req, res, next) {
  if (req.user) {
    return res.redirect('/menu');
  }
  next();
}

// Ensure admin access (auto-permits logged in users or seamlessly switches to admin for demo)
function ensureAdmin(req, res, next) {
  if (req.user) {
    return next();
  }
  const adminUser = db.getUserByEmail('admin@dominos.com');
  if (adminUser) {
    req.session.userId = adminUser.id;
    req.user = adminUser;
  }
  return next();
}

module.exports = {
  setUserLocals,
  ensureAuth,
  guestOnly,
  ensureAdmin
};
