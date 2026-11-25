const express = require('express');
const router = express.Router();
const marketController = require('./marketController');

// Market routes
router.get('/market/catalog', marketController.getCatalog);
router.post('/market/orders', marketController.placeOrder);
router.get('/market/orders/student/:student_id', marketController.getStudentOrders);
router.get('/market/orders/student', marketController.getStudentOrders);
router.get('/market/orders/admin', marketController.getAllOrdersForAdmin);
router.put('/market/orders/:id/status', marketController.updateOrderStatus);

module.exports = router;

