const express = require('express');
const router = express.Router();
const controller = require('./teacherAttendanceController');

/**
 * @swagger
 * tags:
 *   name: TeacherAttendance
 *   description: O'qituvchilar davomatini boshqarish
 */

router.post('/teacher-attendances', controller.createTeacherAttendance);
router.post('/teacher-attendances/bulk', controller.bulkTeacherAttendance);
router.get('/teacher-attendances', controller.getTeacherAttendance);
router.get('/teacher-attendances/stats', controller.getTeacherAttendanceStats);
router.get('/teacher-attendances/payroll-report', controller.getPayrollReport);
router.post('/teacher-attendances/cleanup-future', controller.cleanupFutureTeacherAttendances);
router.delete('/teacher-attendances/cleanup-future', controller.cleanupFutureTeacherAttendances);
router.get('/teacher-attendances/:id', controller.getTeacherAttendanceById);
router.put('/teacher-attendances/:id', controller.updateTeacherAttendance);
router.delete('/teacher-attendances/:id', controller.deleteTeacherAttendance);

module.exports = router;
