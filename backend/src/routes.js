const express = require('express');
const router = express.Router();

// Import module routes
const userRoutes = require('./modules/user/userRoutes');
const branchRoutes = require('./modules/branch/branchRoutes');
const employeeRoutes = require('./modules/employee/employeeRoutes');
const teacherRoutes = require('./modules/teacher/teacherRoutes');
const studentRoutes = require('./modules/student/studentRoutes');
const courseRoutes = require('./modules/course/courseRoutes');
const courseModuleRoutes = require('./modules/courseModule/courseModuleRoutes');
const groupRoutes = require('./modules/group/groupRoutes');
const groupStudentRoutes = require('./modules/groupStudent/groupStudentRoutes');
const classroomRoutes = require('./modules/classroom/classroomRoutes');
const lessonRoutes = require('./modules/lesson/lessonRoutes');
const attendanceRoutes = require('./modules/attendance/attendanceRoutes');
const paymentMethodRoutes = require('./modules/paymentMethod/paymentMethodRoutes');
const paymentRoutes = require('./modules/payment/paymentRoutes');
const invoiceRoutes = require('./modules/invoice/invoiceRoutes');
const examRoutes = require('./modules/exam/examRoutes');
const examResultRoutes = require('./modules/examResult/examResultRoutes');
const certificateRoutes = require('./modules/certificate/certificateRoutes');
const notificationRoutes = require('./modules/notification/notificationRoutes');
const leadRoutes = require('./modules/lead/leadRoutes');
const trialLessonRoutes = require('./modules/trialLesson/trialLessonRoutes');
const activityRoutes = require('./modules/activity/activityRoutes');
const contractRoutes = require('./modules/contract/contractRoutes');
const smsRoutes = require('./modules/sms/smsRoutes');
const teacherAttendanceRoutes = require('./modules/teacherAttendance/teacherAttendanceRoutes');
const gradeRoutes = require('./modules/grade/gradeRoutes');
const marketRoutes = require('./modules/market/marketRoutes');
const parentRoutes = require('./modules/parent/parentRoutes');

// Mount routes
router.use('/', smsRoutes);
router.use('/', userRoutes);
router.use('/', branchRoutes);
router.use('/', employeeRoutes);
router.use('/', teacherRoutes);
router.use('/', studentRoutes);
router.use('/', courseRoutes);
router.use('/', courseModuleRoutes);
router.use('/', groupRoutes);
router.use('/', groupStudentRoutes);
router.use('/', classroomRoutes);
router.use('/', lessonRoutes);
router.use('/', attendanceRoutes);
router.use('/', teacherAttendanceRoutes);
router.use('/', paymentMethodRoutes);
router.use('/', paymentRoutes);
router.use('/', invoiceRoutes);
router.use('/', examRoutes);
router.use('/', examResultRoutes);
router.use('/', certificateRoutes);
router.use('/', notificationRoutes);
router.use('/', leadRoutes);
router.use('/', trialLessonRoutes);
router.use('/', activityRoutes);
router.use('/', contractRoutes);
router.use('/', gradeRoutes);
router.use('/', marketRoutes);
router.use('/', parentRoutes);













module.exports = router;






