const express = require('express');
const router = express.Router();
const db = require('../data/db');

// GET /
router.get('/', (req, res) => {
  const allPizzas = db.getPizzas();
  const bestsellers = allPizzas.filter(p => p.isBestseller);
  const vegSpecial = allPizzas.filter(p => p.category === 'veg').slice(0, 4);
  const nonVegSpecial = allPizzas.filter(p => p.category === 'nonveg').slice(0, 4);
  const desserts = allPizzas.filter(p => p.category === 'desserts');

  res.render('index', {
    pageTitle: 'Domino\'s Pizza - Order Online Delicious Hot & Cheesy Pizzas',
    bestsellers,
    vegSpecial,
    nonVegSpecial,
    desserts,
    coupons: db.getCoupons()
  });
});

// GET /menu
router.get('/menu', (req, res) => {
  const category = req.query.category || 'all';
  const query = (req.query.q || '').toLowerCase().trim();
  const sort = req.query.sort || 'popular'; // popular, price_low, price_high, rating

  let pizzas = db.getPizzas();

  // Category filter
  if (category !== 'all') {
    if (category === 'veg') {
      pizzas = pizzas.filter(p => p.isVeg);
    } else if (category === 'nonveg') {
      pizzas = pizzas.filter(p => !p.isVeg);
    } else {
      pizzas = pizzas.filter(p => p.category === category);
    }
  }

  // Search filter
  if (query) {
    pizzas = pizzas.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.tagline && p.tagline.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  }

  // Sorting
  if (sort === 'price_low') {
    pizzas.sort((a, b) => {
      const pA = a.sizes[a.defaultSize || 'regular']?.price || 0;
      const pB = b.sizes[b.defaultSize || 'regular']?.price || 0;
      return pA - pB;
    });
  } else if (sort === 'price_high') {
    pizzas.sort((a, b) => {
      const pA = a.sizes[a.defaultSize || 'regular']?.price || 0;
      const pB = b.sizes[b.defaultSize || 'regular']?.price || 0;
      return pB - pA;
    });
  } else if (sort === 'rating') {
    pizzas.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  res.render('menu', {
    pageTitle: 'Explore Menu - Domino\'s Pizza',
    pizzas,
    activeCategory: category,
    searchQuery: req.query.q || '',
    activeSort: sort
  });
});

// GET /deals
router.get('/deals', (req, res) => {
  const coupons = db.getCoupons();
  res.render('deals', {
    pageTitle: 'Deals & Offers - Domino\'s Pizza',
    coupons
  });
});

// API endpoint for menu items
router.get('/api/pizzas', (req, res) => {
  res.json({ success: true, pizzas: db.getPizzas() });
});

router.get('/api/pizzas/:id', (req, res) => {
  const pizza = db.getPizzaById(req.params.id);
  if (!pizza) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, pizza });
});

module.exports = router;
