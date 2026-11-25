const express = require('express');
const router = express.Router();
const contractController = require('./contractController');
const { authenticate } = require('../../middleware/authMiddleware');
const { authorize } = require('../../middleware/roleMiddleware');

// Shartnomalar faqat Admin va Super Admin uchun ruxsat etilgan
router.use('/contracts', authenticate, authorize('ADMIN'));

// Shartnomalar yo'nalishlari (Contracts Routes)
router.get('/contracts/my', contractController.getMyContract);
router.get('/contracts', contractController.getContracts);
router.get('/contracts/:id', contractController.getContractById);
router.post('/contracts', contractController.createContract);
router.put('/contracts/:id', contractController.updateContract);
router.post('/contracts/:id/renew', contractController.renewContract);
router.delete('/contracts/:id', contractController.deleteContract);

module.exports = router;
