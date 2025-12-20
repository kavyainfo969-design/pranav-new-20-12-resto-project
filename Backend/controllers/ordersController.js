const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
  try {
    const { restaurantId, items, total, paymentStatus, paymentMethod } = req.body;
    if (!restaurantId || !items || !Array.isArray(items) || total == null) {
      return res.status(400).json({ message: 'Missing order data' });
    }
    const userId = req.userId || null;
    // Allow frontend to pass paymentStatus/paymentMethod so admin can see paid orders immediately
    const orderData = { restaurantId, userId, items, total };
    if (paymentStatus) orderData.paymentStatus = paymentStatus;
    if (paymentMethod) orderData.paymentMethod = paymentMethod;

    const order = new Order(orderData);
    await order.save();
    return res.status(201).json({ order });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ message: 'Failed to create order' });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.json({ order });
  } catch (err) {
    console.error('Get order error:', err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
};

exports.listOrders = async (req, res) => {
  try {
    const { restaurantId, userId } = req.query;
    const filter = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    if (userId) filter.userId = userId;
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    return res.json({ orders });
  } catch (err) {
    console.error('List orders error:', err);
    return res.status(500).json({ message: 'Failed to list orders' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status required' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status, updatedAt: Date.now() }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.json({ order });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ message: 'Failed to update order status' });
  }
};
