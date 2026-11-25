const { verifyToken } = require('../utils/auth');
const { errorResponse } = require('../utils/response');
const { User, Teacher, Student, Employee } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Access denied. No token provided.', 401);
    }

    const decoded = verifyToken(token);

    // Foydalanuvchi bazada mavjudligi va faolligini tekshirish
    const user = await User.findByPk(decoded.id);
    if (!user || (user.status && user.status.toLowerCase() !== 'active')) {
      return errorResponse(res, "Foydalanuvchi hisobi o'chirilgan yoki bloklangan.", 401);
    }

    const role = (user.role || '').toUpperCase();
    let employeeData = null;
    if (role === 'TEACHER') {
      const teacher = await Teacher.findOne({ where: { user_id: user.id } });
      if (!teacher || (teacher.status && teacher.status.toLowerCase() !== 'active')) {
        return errorResponse(res, "O'qituvchi profili o'chirilgan yoki faol emas.", 401);
      }
    } else if (role === 'STUDENT') {
      const student = await Student.findOne({ where: { user_id: user.id } });
      if (!student || (student.status && student.status.toLowerCase() !== 'active')) {
        return errorResponse(res, "Talaba profili o'chirilgan yoki faol emas.", 401);
      }
    } else if (role === 'STAFF' || role === 'EMPLOYEE') {
      const employee = await Employee.findOne({ where: { user_id: user.id } });
      if (!employee || (employee.status && employee.status.toLowerCase() !== 'active')) {
        return errorResponse(res, "Xodim profili o'chirilgan yoki faol emas.", 401);
      }
      employeeData = employee;
      const pos = (employee.position || '').toLowerCase();
      if (pos.includes('tozalik') || pos.includes('farrosh') || pos.includes('cleaner') || pos.includes('ubor')) {
        return errorResponse(res, "Tozalik xodimi uchun tizimga kirish taqiqlangan.", 401);
      }
    }

    // Har qanday boshqa holatda ham Employee jadvalida tozalik lavozimi bo'lsa kirish taqiqlanadi
    if (Employee && !employeeData) {
      const empCheck = await Employee.findOne({ where: { user_id: user.id } });
      if (empCheck) {
        employeeData = empCheck;
        if (empCheck.position) {
          const p = empCheck.position.toLowerCase();
          if (p.includes('tozalik') || p.includes('farrosh') || p.includes('cleaner') || p.includes('ubor')) {
            return errorResponse(res, "Tozalik xodimi uchun tizimga kirish taqiqlangan.", 401);
          }
        }
      }
    }

    const rawPos = (employeeData?.position || '').trim();
    const isAccountant = rawPos && (
      rawPos.toLowerCase().includes('buxgalter') ||
      rawPos.toLowerCase().includes('bugalter') ||
      rawPos.toLowerCase().includes('accountant') ||
      rawPos.toLowerCase().includes('kassir')
    );

    req.user = {
      ...decoded,
      role: user.role,
      branch_id: user.branch_id,
      position: rawPos || null,
      isAccountant: !!isAccountant
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired.', 401);
    }
    return errorResponse(res, 'Invalid token.', 401);
  }
};

module.exports = {
  authenticate
};
