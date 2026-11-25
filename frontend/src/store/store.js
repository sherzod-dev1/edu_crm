import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import branchReducer from './slices/branchSlice';
import employeeReducer from './slices/employeeSlice';
import teacherReducer from './slices/teacherSlice';
import studentReducer from './slices/studentSlice';
import courseReducer from './slices/courseSlice';
import courseModuleReducer from './slices/courseModuleSlice';
import groupReducer from './slices/groupSlice';
import groupStudentReducer from './slices/groupStudentSlice';
import classroomReducer from './slices/classroomSlice';
import lessonReducer from './slices/lessonSlice';
import attendanceReducer from './slices/attendanceSlice';
import paymentMethodReducer from './slices/paymentMethodSlice';
import paymentReducer from './slices/paymentSlice';
import examReducer from './slices/examSlice';
import examResultReducer from './slices/examResultSlice';
import certificateReducer from './slices/certificateSlice';
import notificationReducer from './slices/notificationSlice';
import leadReducer from './slices/leadSlice';
import trialLessonReducer from './slices/trialLessonSlice';
import activityReducer from './slices/activitySlice';
import contractReducer from './slices/contractSlice';
import teacherAttendanceReducer from './slices/teacherAttendanceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    branch: branchReducer,
    employee: employeeReducer,
    teacher: teacherReducer,
    student: studentReducer,
    course: courseReducer,
    courseModule: courseModuleReducer,
    group: groupReducer,
    groupStudent: groupStudentReducer,
    classroom: classroomReducer,
    lesson: lessonReducer,
    attendance: attendanceReducer,
    teacherAttendance: teacherAttendanceReducer,
    paymentMethod: paymentMethodReducer,
    payment: paymentReducer,
    exam: examReducer,
    examResult: examResultReducer,
    certificate: certificateReducer,
    notification: notificationReducer,
    lead: leadReducer,
    trialLesson: trialLessonReducer,
    activity: activityReducer,
    contract: contractReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
