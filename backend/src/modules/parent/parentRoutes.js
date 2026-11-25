const express = require('express');
const router = express.Router();
const parentController = require('./parentController');
const { authenticate } = require('../../middleware/authMiddleware');

// 1. Overview for logged-in Parent
router.get('/parent/overview', authenticate, parentController.getParentOverview);

// 2. Overview for Admin / Manager for specific student
router.get('/parent/student/:studentId/overview', authenticate, parentController.getParentOverview);

// 3. Admin gets or generates parent credentials
router.get('/parent/student/:studentId/credentials', authenticate, parentController.getOrCreateParentCredentials);

// 4. Admin updates parent credentials
router.post('/parent/student/:studentId/credentials', authenticate, parentController.updateParentCredentials);

module.exports = router;

