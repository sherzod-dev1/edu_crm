const express = require('express');
const router = express.Router();
const gradeController = require('./gradeController');
const { authenticate } = require('../../middleware/authMiddleware');

// Grade routes
router.get('/grades/my-coins', authenticate, gradeController.getMyCoins);
router.get('/grades/group', gradeController.getGroupGrades);
router.post('/grades', authenticate, gradeController.saveGrade);
router.post('/grades/bulk', authenticate, gradeController.bulkSaveGrades);
router.get('/grades/admin', gradeController.getAllGradesForAdmin);
router.get('/grades/leaderboard', authenticate, gradeController.getLeaderboard);
router.get('/grades/student/:student_id', authenticate, gradeController.getStudentGrades);
router.get('/grades/student', authenticate, gradeController.getStudentGrades);

module.exports = router;

