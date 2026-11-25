const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const db = {};

// Import Models
db.User = require('../modules/user/userModel')(sequelize, DataTypes);
db.Branch = require('../modules/branch/branchModel')(sequelize, DataTypes);
db.Employee = require('../modules/employee/employeeModel')(sequelize, DataTypes);
db.Teacher = require('../modules/teacher/teacherModel')(sequelize, DataTypes);
db.Student = require('../modules/student/studentModel')(sequelize, DataTypes);
db.Course = require('../modules/course/courseModel')(sequelize, DataTypes);
db.CourseModule = require('../modules/courseModule/courseModuleModel')(sequelize, DataTypes);
db.Group = require('../modules/group/groupModel')(sequelize, DataTypes);
db.GroupStudent = require('../modules/groupStudent/groupStudentModel')(sequelize, DataTypes);
db.Classroom = require('../modules/classroom/classroomModel')(sequelize, DataTypes);
db.Lesson = require('../modules/lesson/lessonModel')(sequelize, DataTypes);
db.Attendance = require('../modules/attendance/attendanceModel')(sequelize, DataTypes);
db.PaymentMethod = require('../modules/paymentMethod/paymentMethodModel')(sequelize, DataTypes);
db.Payment = require('../modules/payment/paymentModel')(sequelize, DataTypes);
db.Invoice = require('../modules/invoice/invoiceModel')(sequelize, DataTypes);
db.Exam = require('../modules/exam/examModel')(sequelize, DataTypes);
db.ExamResult = require('../modules/examResult/examResultModel')(sequelize, DataTypes);
db.Certificate = require('../modules/certificate/certificateModel')(sequelize, DataTypes);
db.Notification = require('../modules/notification/notificationModel')(sequelize, DataTypes);
db.Lead = require('../modules/lead/leadModel')(sequelize, DataTypes);
db.TrialLesson = require('../modules/trialLesson/trialLessonModel')(sequelize, DataTypes);
db.Activity = require('../modules/activity/activityModel')(sequelize, DataTypes);
db.Contract = require('../modules/contract/contractModel')(sequelize, DataTypes);
db.TeacherAttendance = require('../modules/teacherAttendance/teacherAttendanceModel')(sequelize, DataTypes);
db.StudentGrade = require('../modules/grade/gradeModel')(sequelize, DataTypes);
db.MarketOrder = require('../modules/market/marketOrderModel')(sequelize, DataTypes);


















// Run associations if present
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;

