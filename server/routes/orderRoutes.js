const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/authMiddleware');
const { sendSMS } = require('../utils/sms');

// Create order
router.post('/', auth, async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, phone, collectionDate } = req.body;
  if (!orderItems || orderItems.length === 0) return res.status(400).json({ message: 'No order items' });
  const order = await Order.create({
    user: req.user.id,
    orderItems,
    shippingAddress,
    paymentMethod,
    phone,
    collectionDate: collectionDate ? new Date(collectionDate) : undefined
  });
  // Fire and forget SMS (non-blocking)
  if (phone) {
    const first = orderItems[0]?.name || 'item';
    const extra = orderItems.length > 1 ? ` +${orderItems.length - 1} more` : '';
    const when = collectionDate ? new Date(collectionDate).toLocaleDateString() : 'soon';
    try {
      const result = await sendSMS(phone, `Your order ${order._id} (${first}${extra}) placed successfully. Pickup: ${when}.`);
      if (result.ok) {
        order.smsSentAt = new Date();
      } else {
        order.smsError = result.error;
      }
      await order.save();
    } catch (e) {
      order.smsError = e.message;
      await order.save();
    }
  }
  res.status(201).json(order);
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  res.json(order);
});

// Pay order
router.put('/:id/pay', auth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  order.isPaid = true;
  order.paidAt = Date.now();
  await order.save();
  res.json(order);
});

// List my orders
router.get('/my/list', auth, async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .sort('-createdAt')
    .populate({
      path: 'orderItems.product',
      select: 'name model shop',
      populate: { path: 'shop', select: 'name phone location' }
    })
    .lean();
  res.json(orders);
});

// Admin deliver
router.put('/:id/deliver', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.isDelivered = true;
  order.deliveredAt = Date.now();
  await order.save();
  res.json(order);
});

module.exports = router;
