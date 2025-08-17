const express = require('express');
const router = express.Router();
const BikePart = require('../models/BikePart');
const Shop = require('../models/Shop');
const auth = require('../middleware/authMiddleware');

// Public list
router.get('/', async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  const keyword = req.query.keyword ? { name: { $regex: req.query.keyword, $options: 'i' } } : {};
  const brand = req.query.brand ? { brand: req.query.brand } : {};
  const type = req.query.type ? { type: req.query.type } : {};
  const shop = req.query.shop ? { shop: req.query.shop } : {};
  const filter = { ...keyword, ...brand, ...type, ...shop };
  const count = await BikePart.countDocuments(filter);
  const products = await BikePart.find(filter)
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate('shop', 'name address');
  res.json({ products, page, pages: Math.ceil(count / pageSize), total: count });
});

router.get('/:id', async (req, res) => {
  const product = await BikePart.findById(req.params.id).populate('shop','name address');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

// Vendor/Admin create part tied to vendor's own shop
router.post('/', auth, async (req, res) => {
  if (!['vendor', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  let shopId = req.body.shop;
  if (req.user.role === 'vendor') {
    const myShop = await Shop.findOne({ vendor: req.user.id });
    if (!myShop) return res.status(400).json({ message: 'Create/update your shop first' });
    shopId = myShop._id;
  }
  // Derive a friendly name if not provided
  const name = req.body.name || [req.body.company, req.body.model].filter(Boolean).join(' ') || 'Bike Part';
  const images = Array.isArray(req.body.images) ? req.body.images : [];
  if (req.body.imageUrl) images.unshift(req.body.imageUrl);
  const payload = { ...req.body, images, name, vendor: req.user.id, shop: shopId };
  const created = await BikePart.create(payload);
  res.status(201).json(created);
});

// Update
router.put('/:id', auth, async (req, res) => {
  const product = await BikePart.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });
  if (req.user.role === 'vendor') {
    const myShop = await Shop.findOne({ vendor: req.user.id });
    if (!myShop || product.shop.toString() !== myShop._id.toString()) return res.status(403).json({ message: 'Forbidden' });
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  Object.assign(product, req.body);
  await product.save();
  res.json(product);
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  const product = await BikePart.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });
  if (req.user.role === 'vendor') {
    const myShop = await Shop.findOne({ vendor: req.user.id });
    if (!myShop || product.shop.toString() !== myShop._id.toString()) return res.status(403).json({ message: 'Forbidden' });
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await product.deleteOne();
  res.json({ message: 'Deleted' });
});

module.exports = router;
