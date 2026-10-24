const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const salesforceService = require('../services/salesforceService');

const DATA_DIR = __dirname;
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PIZZAS_FILE = path.join(DATA_DIR, 'pizzas.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');

// Helper to safely read JSON
function readJSON(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const data = fs.readFileSync(file, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return fallback;
  }
}

// Helper to safely write JSON
function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

// Initial Menu Seed
const defaultPizzas = [
  {
    id: "pizza-1",
    name: "Farmhouse",
    category: "veg",
    tagline: "Delightful combination of onion, capsicum, tomato & grilled mushroom",
    description: "A classic favorite! Loaded with crunchy crisp capsicum, juicy tomatoes, succulent mushrooms, and flavorful onions on freshly tossed crust with molten mozzarella.",
    isVeg: true,
    isBestseller: true,
    rating: 4.8,
    reviewsCount: 1420,
    sizes: {
      regular: { name: "Regular", price: 259, serves: "Serves 1 (4 slices)" },
      medium: { name: "Medium", price: 459, serves: "Serves 2 (6 slices)" },
      large: { name: "Large", price: 689, serves: "Serves 4 (8 slices)" }
    },
    defaultSize: "medium",
    crusts: [
      { id: "hand-tossed", name: "New Hand Tossed", extraPrice: 0 },
      { id: "cheese-burst", name: "Cheese Burst", extraPrice: 99 },
      { id: "fresh-pan", name: "Fresh Pan Pizza", extraPrice: 40 },
      { id: "wheat-thin", name: "100% Wheat Thin Crust", extraPrice: 50 }
    ],
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "pizza-2",
    name: "Peppy Paneer",
    category: "veg",
    tagline: "Chunky paneer with crisp capsicum and spicy red paprika",
    description: "Juicy cottage cheese cubes tossed in spicy seasonings, vibrant green bell peppers, and zingy red paprika slices on top of our signature herb marinara sauce.",
    isVeg: true,
    isBestseller: true,
    rating: 4.9,
    reviewsCount: 1890,
    sizes: {
      regular: { name: "Regular", price: 279, serves: "Serves 1 (4 slices)" },
      medium: { name: "Medium", price: 499, serves: "Serves 2 (6 slices)" },
      large: { name: "Large", price: 749, serves: "Serves 4 (8 slices)" }
    },
    defaultSize: "medium",
    crusts: [
      { id: "hand-tossed", name: "New Hand Tossed", extraPrice: 0 },
      { id: "cheese-burst", name: "Cheese Burst", extraPrice: 99 },
      { id: "fresh-pan", name: "Fresh Pan Pizza", extraPrice: 40 },
      { id: "wheat-thin", name: "100% Wheat Thin Crust", extraPrice: 50 }
    ],
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "pizza-3",
    name: "Margherita",
    category: "veg",
    tagline: "Classic delight with 100% real mozzarella cheese",
    description: "The timeless Italian masterpiece. Simple, pure, and comforting with our signature rich tomato sauce and a thick, molten blanket of 100% dairy mozzarella cheese.",
    isVeg: true,
    isBestseller: false,
    rating: 4.7,
    reviewsCount: 2310,
    sizes: {
      regular: { name: "Regular", price: 179, serves: "Serves 1 (4 slices)" },
      medium: { name: "Medium", price: 329, serves: "Serves 2 (6 slices)" },
      large: { name: "Large", price: 519, serves: "Serves 4 (8 slices)" }
    },
    defaultSize: "medium",
    crusts: [
      { id: "hand-tossed", name: "New Hand Tossed", extraPrice: 0 },
      { id: "cheese-burst", name: "Cheese Burst", extraPrice: 99 },
      { id: "fresh-pan", name: "Fresh Pan Pizza", extraPrice: 40 },
      { id: "wheat-thin", name: "100% Wheat Thin Crust", extraPrice: 50 }
    ],
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "pizza-4",
    name: "Veggie Paradise",
    category: "veg",
    tagline: "Goldern corn, black olives, capsicum & red paprika",
    description: "A veggie lover's dream! Sweet golden American corn, imported Mediterranean black olives, crunchy capsicum, and spicy red paprika.",
    isVeg: true,
    isBestseller: false,
    rating: 4.6,
    reviewsCount: 940,
    sizes: {
      regular: { name: "Regular", price: 269, serves: "Serves 1 (4 slices)" },
      medium: { name: "Medium", price: 479, serves: "Serves 2 (6 slices)" },
      large: { name: "Large", price: 719, serves: "Serves 4 (8 slices)" }
    },
    defaultSize: "medium",
    crusts: [
      { id: "hand-tossed", name: "New Hand Tossed", extraPrice: 0 },
      { id: "cheese-burst", name: "Cheese Burst", extraPrice: 99 },
      { id: "fresh-pan", name: "Fresh Pan Pizza", extraPrice: 40 },
      { id: "wheat-thin", name: "100% Wheat Thin Crust", extraPrice: 50 }
    ],
    image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "pizza-5",
    name: "Pepper Barbecue Chicken",
    category: "nonveg",
    tagline: "Pepper barbecue chicken for that spicy, smokey punch",
    description: "Tender chunks of chicken breast glazed in a smoky pepper barbecue marinade, paired with onions and bubbling mozzarella cheese.",
    isVeg: false,
    isBestseller: true,
    rating: 4.9,
    reviewsCount: 2850,
    sizes: {
      regular: { name: "Regular", price: 299, serves: "Serves 1 (4 slices)" },
      medium: { name: "Medium", price: 539, serves: "Serves 2 (6 slices)" },
      large: { name: "Large", price: 799, serves: "Serves 4 (8 slices)" }
    },
    defaultSize: "medium",
    crusts: [
      { id: "hand-tossed", name: "New Hand Tossed", extraPrice: 0 },
      { id: "cheese-burst", name: "Cheese Burst", extraPrice: 99 },
      { id: "fresh-pan", name: "Fresh Pan Pizza", extraPrice: 40 },
      { id: "wheat-thin", name: "100% Wheat Thin Crust", extraPrice: 50 }
    ],
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "pizza-6",
    name: "Chicken Golden Delight",
    category: "nonveg",
    tagline: "Double pepper barbecue chicken, golden corn & extra cheese",
    description: "An irresistible duo of smoky barbecue chicken chunks and sweet golden corn with double cheese on our signature crust.",
    isVeg: false,
    isBestseller: true,
    rating: 4.8,
    reviewsCount: 1670,
    sizes: {
      regular: { name: "Regular", price: 319, serves: "Serves 1 (4 slices)" },
      medium: { name: "Medium", price: 569, serves: "Serves 2 (6 slices)" },
      large: { name: "Large", price: 839, serves: "Serves 4 (8 slices)" }
    },
    defaultSize: "medium",
    crusts: [
      { id: "hand-tossed", name: "New Hand Tossed", extraPrice: 0 },
      { id: "cheese-burst", name: "Cheese Burst", extraPrice: 99 },
      { id: "fresh-pan", name: "Fresh Pan Pizza", extraPrice: 40 },
      { id: "wheat-thin", name: "100% Wheat Thin Crust", extraPrice: 50 }
    ],
    image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "pizza-7",
    name: "Chicken Dominator",
    category: "nonveg",
    tagline: "Loaded with double pepper barbecue chicken, peri-peri chicken & grilled chicken rasher",
    description: "The ultimate poultry feast! Loaded to the brim with double barbecue chicken, spicy peri-peri chicken chunks, and grilled chicken rashers.",
    isVeg: false,
    isBestseller: true,
    rating: 4.9,
    reviewsCount: 3120,
    sizes: {
      regular: { name: "Regular", price: 379, serves: "Serves 1 (4 slices)" },
      medium: { name: "Medium", price: 659, serves: "Serves 2 (6 slices)" },
      large: { name: "Large", price: 979, serves: "Serves 4 (8 slices)" }
    },
    defaultSize: "medium",
    crusts: [
      { id: "hand-tossed", name: "New Hand Tossed", extraPrice: 0 },
      { id: "cheese-burst", name: "Cheese Burst", extraPrice: 99 },
      { id: "fresh-pan", name: "Fresh Pan Pizza", extraPrice: 40 },
      { id: "wheat-thin", name: "100% Wheat Thin Crust", extraPrice: 50 }
    ],
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "pizza-8",
    name: "Indi Chicken Tikka",
    category: "nonveg",
    tagline: "Tandoori chicken tikka with mint mayo and red paprika",
    description: "Authentic Indian tandoori spices infused chicken tikka cubes, topped with cool mint mayonnaise, fresh onions, and fiery red paprika.",
    isVeg: false,
    isBestseller: false,
    rating: 4.8,
    reviewsCount: 1100,
    sizes: {
      regular: { name: "Regular", price: 349, serves: "Serves 1 (4 slices)" },
      medium: { name: "Medium", price: 599, serves: "Serves 2 (6 slices)" },
      large: { name: "Large", price: 889, serves: "Serves 4 (8 slices)" }
    },
    defaultSize: "medium",
    crusts: [
      { id: "hand-tossed", name: "New Hand Tossed", extraPrice: 0 },
      { id: "cheese-burst", name: "Cheese Burst", extraPrice: 99 },
      { id: "fresh-pan", name: "Fresh Pan Pizza", extraPrice: 40 },
      { id: "wheat-thin", name: "100% Wheat Thin Crust", extraPrice: 50 }
    ],
    image: "https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "side-1",
    name: "Stuffed Garlic Bread",
    category: "sides",
    tagline: "Freshly baked garlic bread with cheese, onion and sweet corn",
    description: "Our signature garlic loaf, baked golden brown, stuffed with molten cheese, sweet corn kernels, and jalapenos, served with creamy dip.",
    isVeg: true,
    isBestseller: true,
    rating: 4.9,
    reviewsCount: 4210,
    sizes: {
      regular: { name: "Standard", price: 169, serves: "Serves 1-2" }
    },
    defaultSize: "regular",
    crusts: [],
    image: "https://images.unsplash.com/photo-1619860860774-1e2e17343432?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "side-2",
    name: "Cheesy Dip",
    category: "sides",
    tagline: "Creamy, smooth jalapeño cheese dip",
    description: "The ultimate companion to your pizza crusts and garlic bread. Rich, velvety, and subtly spiced.",
    isVeg: true,
    isBestseller: false,
    rating: 4.8,
    reviewsCount: 1530,
    sizes: {
      regular: { name: "Standard (25g)", price: 35, serves: "1 Dip" }
    },
    defaultSize: "regular",
    crusts: [],
    image: "https://images.unsplash.com/photo-1579684947550-22e945225d9a?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "dessert-1",
    name: "Choco Lava Cake",
    category: "desserts",
    tagline: "Warm chocolate cake with molten chocolate center",
    description: "Indulgent warm chocolate cake with a heavenly molten fudge center that erupts with every single spoon. An absolute must-have!",
    isVeg: true,
    isBestseller: true,
    rating: 5.0,
    reviewsCount: 6580,
    sizes: {
      regular: { name: "Standard", price: 119, serves: "Serves 1" }
    },
    defaultSize: "regular",
    crusts: [],
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "dessert-2",
    name: "Butterscotch Mousse Cake",
    category: "desserts",
    tagline: "Creamy mousse layered with rich butterscotch crunch",
    description: "Fluffy layers of sweet butterscotch cream mousse over soft sponge, topped with crunchy butterscotch nuggets.",
    isVeg: true,
    isBestseller: false,
    rating: 4.7,
    reviewsCount: 890,
    sizes: {
      regular: { name: "Standard", price: 109, serves: "Serves 1" }
    },
    defaultSize: "regular",
    crusts: [],
    image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "bev-1",
    name: "Pepsi 475ml",
    category: "beverages",
    tagline: "Chilled sparkling refreshment",
    description: "Cold and fizzy Pepsi to wash down your hot, cheesy pizza slices.",
    isVeg: true,
    isBestseller: false,
    rating: 4.9,
    reviewsCount: 2200,
    sizes: {
      regular: { name: "475ml Bottle", price: 65, serves: "Serves 1" }
    },
    defaultSize: "regular",
    crusts: [],
    image: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "bev-2",
    name: "Mirinda 475ml",
    category: "beverages",
    tagline: "Tangy orange bubbly refreshment",
    description: "Vibrant and fruity orange blast that pairs delightfully with spicy pizzas.",
    isVeg: true,
    isBestseller: false,
    rating: 4.7,
    reviewsCount: 1120,
    sizes: {
      regular: { name: "475ml Bottle", price: 65, serves: "Serves 1" }
    },
    defaultSize: "regular",
    crusts: [],
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80"
  }
];

// Initial Coupons Seed
const defaultCoupons = [
  {
    code: "DOMINOS50",
    description: "50% OFF up to ₹150 on your order",
    discountPercent: 50,
    maxDiscount: 150,
    minOrder: 299
  },
  {
    code: "CHEESELOVE",
    description: "Flat ₹100 OFF on orders above ₹499",
    flatDiscount: 100,
    minOrder: 499
  },
  {
    code: "PARTYPACK",
    description: "20% OFF on orders above ₹799",
    discountPercent: 20,
    maxDiscount: 250,
    minOrder: 799
  }
];

// Initialize DB Files
function initDB() {
  if (!fs.existsSync(PIZZAS_FILE)) {
    writeJSON(PIZZAS_FILE, defaultPizzas);
  }
  if (!fs.existsSync(COUPONS_FILE)) {
    writeJSON(COUPONS_FILE, defaultCoupons);
  }
  if (!fs.existsSync(USERS_FILE)) {
    // Seed a demo user and an admin user
    const salt = bcrypt.genSaltSync(10);
    const demoHashed = bcrypt.hashSync("password123", salt);
    const adminHashed = bcrypt.hashSync("admin123", salt);
    
    const seedUsers = [
      {
        id: "usr-demo",
        name: "Rahul Sharma",
        email: "demo@dominos.com",
        phone: "9876543210",
        password: demoHashed,
        role: "user",
        addresses: [
          {
            id: "addr-1",
            type: "Home",
            flat: "Flat 402, Sunshine Heights",
            area: "Indiranagar, 100 Feet Road",
            city: "Bengaluru",
            pincode: "560038"
          }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-admin",
        name: "Domino's Store Manager",
        email: "admin@dominos.com",
        phone: "9800000000",
        password: adminHashed,
        role: "admin",
        addresses: [],
        createdAt: new Date().toISOString()
      }
    ];
    writeJSON(USERS_FILE, seedUsers);
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    writeJSON(ORDERS_FILE, []);
  }
}

initDB();

module.exports = {
  // Users
  getUsers: () => readJSON(USERS_FILE),
  getUserById: (id) => readJSON(USERS_FILE).find(u => u.id === id),
  getUserByEmail: (email) => readJSON(USERS_FILE).find(u => u.email.toLowerCase() === email.toLowerCase().trim()),
  createUser: (userData) => {
    const users = readJSON(USERS_FILE);
    const newUser = {
      id: "usr-" + Date.now(),
      ...userData,
      role: userData.role || "user",
      addresses: userData.addresses || [],
      salesforceSync: {
        status: "PENDING",
        salesforceId: null,
        syncedAt: null
      },
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    writeJSON(USERS_FILE, users);

    // Trigger Salesforce Customer Sync (Asynchronous)
    salesforceService.syncCustomer(newUser).then(res => {
      if (res && res.success) {
        newUser.salesforceSync = {
          status: res.mode === 'STANDBY_MOCKED' ? 'READY_FOR_SF' : 'SYNCED',
          salesforceId: res.salesforceId || null,
          syncedAt: new Date().toISOString()
        };
        const updatedUsers = readJSON(USERS_FILE);
        const idx = updatedUsers.findIndex(u => u.id === newUser.id);
        if (idx > -1) {
          updatedUsers[idx].salesforceSync = newUser.salesforceSync;
          writeJSON(USERS_FILE, updatedUsers);
        }
      }
    }).catch(e => console.error('Salesforce customer sync deferred:', e.message));

    return newUser;
  },
  updateUser: (id, updates) => {
    const users = readJSON(USERS_FILE);
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    writeJSON(USERS_FILE, users);
    return users[idx];
  },

  // Pizzas / Menu
  getPizzas: () => readJSON(PIZZAS_FILE),
  getPizzaById: (id) => readJSON(PIZZAS_FILE).find(p => p.id === id),
  addPizza: (item) => {
    const pizzas = readJSON(PIZZAS_FILE);
    pizzas.push(item);
    writeJSON(PIZZAS_FILE, pizzas);
    return item;
  },

  // Coupons
  getCoupons: () => readJSON(COUPONS_FILE),
  getCouponByCode: (code) => readJSON(COUPONS_FILE).find(c => c.code.toUpperCase() === (code || '').toUpperCase().trim()),

  // Orders
  getOrders: () => readJSON(ORDERS_FILE),
  getOrderById: (id) => readJSON(ORDERS_FILE).find(o => o.id === id),
  getOrdersByUserId: (userId) => readJSON(ORDERS_FILE).filter(o => o.userId === userId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)),
  createOrder: (orderData) => {
    const orders = readJSON(ORDERS_FILE);
    const newOrder = {
      id: "DOM-" + Math.floor(100000 + Math.random() * 900000),
      ...orderData,
      status: "order_placed", // order_placed -> preparing -> baking -> quality_check -> out_for_delivery -> delivered
      statusHistory: [
        { status: "order_placed", label: "Order Confirmed", time: new Date().toISOString() }
      ],
      estimatedDeliveryMinutes: 30,
      deliveryAgent: {
        name: "Vikram Singh",
        phone: "+91 98451 23456",
        rating: 4.9,
        vehicleNumber: "KA-01-EZ-7890"
      },
      salesforceSync: {
        status: "PENDING",
        salesforceOrderId: null,
        syncedAt: null
      },
      createdAt: new Date().toISOString()
    };
    orders.unshift(newOrder);
    writeJSON(ORDERS_FILE, orders);

    // Trigger Salesforce Order Sync (Asynchronous)
    salesforceService.syncOrder(newOrder).then(res => {
      if (res && res.success) {
        newOrder.salesforceSync = {
          status: res.mode === 'STANDBY_MOCKED' ? 'READY_FOR_SF' : 'SYNCED',
          salesforceOrderId: res.salesforceOrderId || null,
          syncedAt: new Date().toISOString()
        };
        const updatedOrders = readJSON(ORDERS_FILE);
        const idx = updatedOrders.findIndex(o => o.id === newOrder.id);
        if (idx > -1) {
          updatedOrders[idx].salesforceSync = newOrder.salesforceSync;
          writeJSON(ORDERS_FILE, updatedOrders);
        }
      }
    }).catch(e => console.error('Salesforce order sync deferred:', e.message));

    return newOrder;
  },
  updateOrderStatus: (id, newStatus) => {
    const orders = readJSON(ORDERS_FILE);
    const order = orders.find(o => o.id === id);
    if (!order) return null;
    
    order.status = newStatus;
    const statusLabels = {
      order_placed: "Order Confirmed",
      preparing: "Preparing Dough & Sauces",
      baking: "Baking in Oven",
      quality_check: "Quality Check & Packing",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered Enjoy your meal!"
    };
    
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: newStatus,
      label: statusLabels[newStatus] || newStatus,
      time: new Date().toISOString()
    });
    
    writeJSON(ORDERS_FILE, orders);
    return order;
  }
};
