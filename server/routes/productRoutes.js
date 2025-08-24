const express = require('express');
const router = express.Router();
const BikePart = require('../models/BikePart');
const Shop = require('../models/Shop');
const auth = require('../middleware/authMiddleware');

// Public list
// Unique companies
router.get('/groups/companies', async (req, res) => {
  const companies = await BikePart.distinct('company', { company: { $ne: null, $ne: '' } });
  res.json({ companies });
});

// Unique models by company
router.get('/groups/models', async (req, res) => {
  const company = req.query.company;
  if (!company) return res.status(400).json({ message: 'company is required' });
  const models = await BikePart.distinct('model', { company, model: { $ne: null, $ne: '' } });
  res.json({ company, models });
});

// Distinct brands
router.get('/groups/brands', async (_req, res) => {
  const brands = await BikePart.distinct('brand', { brand: { $ne: null, $ne: '' } });
  res.json({ brands });
});

// Distinct types
router.get('/groups/types', async (_req, res) => {
  const types = await BikePart.distinct('type', { type: { $ne: null, $ne: '' } });
  res.json({ types });
});

// Public list
router.get('/', async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  const brand = req.query.brand ? { brand: req.query.brand } : {};
  const company = req.query.company ? { company: req.query.company } : {};
  const model = req.query.model ? { model: req.query.model } : {};
  const type = req.query.type ? { type: req.query.type } : {};
  const shop = req.query.shop ? { shop: req.query.shop } : {};
  let filter = { ...brand, ...company, ...model, ...type, ...shop };
  const kw = (req.query.keyword || '').trim();
  if (kw) {
    const regex = { $regex: kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    // Match across multiple textual fields
    filter = { ...filter, $or: [
      { name: regex },
      { model: regex },
      { company: regex },
      { brand: regex },
      { type: regex }
    ]};
  }

// Debug: view first 20 raw docs (admin only)
router.get('/debug/raw', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const docs = await BikePart.find({}).limit(20).lean();
    res.json({ count: docs.length, docs });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
  const count = await BikePart.countDocuments(filter);
  const products = await BikePart.find(filter)
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    // include shop location coordinates for distance/maps
    .populate({ path: 'shop', select: 'name address location' })
    .lean();
  res.json({ products, page, pages: Math.ceil(count / pageSize), total: count });
});

router.get('/:id', async (req, res) => {
  const product = await BikePart.findById(req.params.id).populate('shop','name address location');
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
  // Accept either a single model or an array of models; expand to multiple docs when needed
  const images = Array.isArray(req.body.images) ? req.body.images : [];
  if (req.body.imageUrl) images.unshift(req.body.imageUrl);
  const base = { ...req.body, images };
  const models = Array.isArray(req.body.models) ? req.body.models : [];
  let createdDocs = [];
  if (models.filter(Boolean).length > 1) {
    const docs = models.filter(Boolean).map(m => {
      const name = base.name || [base.company, m].filter(Boolean).join(' ') || 'Bike Part';
      return { ...base, model: m, name, vendor: req.user.id, shop: shopId };
    });
    createdDocs = await BikePart.insertMany(docs);
    return res.status(201).json({ created: createdDocs.map(d => d._id) });
  } else {
    const model = (models[0] || base.model || '').trim();
    const name = base.name || [base.company, model].filter(Boolean).join(' ') || 'Bike Part';
    const payload = { ...base, model, name, vendor: req.user.id, shop: shopId };
    const created = await BikePart.create(payload);
    return res.status(201).json(created);
  }
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

// Vendor can rate products (1-5) with comment; one review per user per product
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    if (!['vendor','admin','customer'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    const { rating, comment } = req.body;
    const product = await BikePart.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    const already = product.reviews?.find(r => r.user.toString() === req.user.id);
    if (already) return res.status(400).json({ message: 'Product already reviewed' });
    product.reviews.push({ user: req.user.id, name: req.user.name, rating: Number(rating), comment });
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((a, r) => a + r.rating, 0) / product.numReviews;
    await product.save();
    res.status(201).json({ message: 'Review added' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
