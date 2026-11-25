import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layout/MainLayout';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Users from '../pages/Users';
import Branches from '../pages/Branches';
import Employees from '../pages/Employees';
import Teachers from '../pages/Teachers';
import Students from '../pages/Students';
import Courses from '../pages/Courses';
import CourseModules from '../pages/CourseModules';
import Groups from '../pages/Groups';
import GroupStudents from '../pages/GroupStudents';
import Classrooms from '../pages/Classrooms';
import Lessons from '../pages/Lessons';
import Attendance from '../pages/Attendance';
import PaymentMethods from '../pages/PaymentMethods';
import Payments from '../pages/Payments';
import Exams from '../pages/Exams';
import ExamResults from '../pages/ExamResults';
import Certificates from '../pages/Certificates';
import Notifications from '../pages/Notifications';
import Leads from '../pages/Leads';
import TrialLessons from '../pages/TrialLessons';
import Activities from '../pages/Activities';
import Contracts from '../pages/Contracts';
import Profile from '../pages/Profile';
import Grades from '../pages/Grades';
import Market from '../pages/Market';
import Homework from '../pages/Homework';
import ParentPortal from '../pages/ParentPortal';
import { formatStaffPosition } from '../utils/helpers/formatPosition';

import { useSelector } from 'react-redux';

const RoleGuard = ({ allowedRoles, disallowedRoles = [], children }) => {
  const { user } = useSelector((state) => state.auth || {});
  const role = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || user?.is_superadmin;
  if (isSuperAdmin) return children;

  const rawPosition = user?.position || user?.employee?.position || user?.employee_profile?.position;
  const userPosition = formatStaffPosition(rawPosition);
  const isInspector =
    userPosition === 'Nazoratchi' ||
    role === 'NAZORATCHI' ||
    role === 'SUPERVISOR' ||
    role === 'INSPECTOR';

  // Agar rol taqiqlangan ro'yxatda bo'lsa (masalan Nazoratchiga tanga/magazin taqiqlangan)
  if (isInspector && disallowedRoles && disallowedRoles.includes('INSPECTOR')) {
    return <Navigate to="/dashboard" replace />;
  }

  const isAccountant = rawPosition && (
    rawPosition.toLowerCase().includes('buxgalter') ||
    rawPosition.toLowerCase().includes('bugalter') ||
    rawPosition.toLowerCase().includes('accountant') ||
    rawPosition.toLowerCase().includes('kassir')
  );

  if (allowedRoles && allowedRoles.length > 0) {
    const normalized = allowedRoles.map((r) => r.toUpperCase());
    if (normalized.includes(role)) {
      return children;
    }
    if (isInspector && (normalized.includes('NAZORATCHI') || normalized.includes('SUPERVISOR') || normalized.includes('INSPECTOR'))) {
      return children;
    }
    if (isAccountant && (normalized.includes('ACCOUNTANT') || normalized.includes('BUXGALTER'))) {
      return children;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* Protected CRM Routes inside MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admins" element={<RoleGuard allowedRoles={['SUPER_ADMIN']}><Users initialRole="ADMIN" /></RoleGuard>} />
          <Route path="/users" element={<RoleGuard allowedRoles={['SUPER_ADMIN']}><Users /></RoleGuard>} />
          <Route path="/contracts" element={<RoleGuard allowedRoles={['ADMIN']}><Contracts /></RoleGuard>} />
          <Route path="/branches" element={<RoleGuard allowedRoles={['SUPER_ADMIN']}><Branches /></RoleGuard>} />
          <Route path="/employees" element={<RoleGuard allowedRoles={['ADMIN', 'ACCOUNTANT']}><Employees /></RoleGuard>} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/students" element={<Students />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/course-modules" element={<CourseModules />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/group-students" element={<GroupStudents />} />
          <Route path="/classrooms" element={<Classrooms />} />
          <Route path="/lessons" element={<Lessons />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/teacher-attendance" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'NAZORATCHI', 'SUPERVISOR', 'INSPECTOR', 'ACCOUNTANT', 'BUXGALTER', 'STAFF']}><Attendance defaultTab="teachers" /></RoleGuard>} />
          <Route path="/payment-methods" element={<PaymentMethods />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/exam-results" element={<ExamResults />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/notifications" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'NAZORATCHI', 'SUPERVISOR', 'INSPECTOR']}><Notifications /></RoleGuard>} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/trial-lessons" element={<TrialLessons />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/homework" element={<Homework />} />
          <Route path="/parent-portal" element={<RoleGuard allowedRoles={['PARENT', 'ADMIN', 'SUPER_ADMIN', 'MANAGER']}><ParentPortal /></RoleGuard>} />
          <Route path="/grades" element={<RoleGuard allowedRoles={['TEACHER', 'STUDENT']}><Grades /></RoleGuard>} />
          <Route path="/market" element={<RoleGuard disallowedRoles={['INSPECTOR']}><Market /></RoleGuard>} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
