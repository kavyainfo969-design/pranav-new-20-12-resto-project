const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authMiddleware = require('../middleware/authMiddleware');

// Public: allow customers (even unauthenticated) to create orders so the
// storefront can persist them after payment. Admin routes (status updates)
// still require authentication.
router.post('/', ordersController.createOrder);
router.get('/', ordersController.listOrders);
router.get('/:id', ordersController.getOrder);
router.put('/:id/status', authMiddleware, ordersController.updateStatus);

module.exports = router;
