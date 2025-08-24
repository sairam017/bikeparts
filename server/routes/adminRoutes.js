const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Shop = require('../models/Shop');
const auth = require('../middleware/authMiddleware');

// Guard admin
router.use(auth, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
});

// List users (sanitized)
router.get('/users', async (_req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// Create vendor with initial shop
router.post('/vendors/create', async (req, res) => {
  try {
    if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { vendorName, shopName, contactNumber, email, password, confirmPassword } = req.body;
    if (!vendorName || !shopName || !email || !password || !contactNumber) return res.status(400).json({ message: 'Missing required fields' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const vendor = await User.create({ name: vendorName, email, password, role: 'vendor' });

    const shop = await Shop.create({
      name: shopName,
      vendor: vendor._id,
      phone: String(contactNumber),
      location: { type: 'Point', coordinates: [0,0] } // placeholder coordinates; update later via shop update
    });

    res.status(201).json({ vendor: { id: vendor._id, name: vendor.name, email: vendor.email }, shop });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset a user's password (admin only)
router.post('/users/reset-password', async (req, res) => {
  try {
    const { email, id, password } = req.body;
    if (!password || password.length < 4) return res.status(400).json({ message: 'Password too short' });
    let user;
    if (id) user = await User.findById(id);
    else if (email) user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = password; // will be hashed by pre-save hook
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
