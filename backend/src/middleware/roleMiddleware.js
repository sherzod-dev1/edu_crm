const { errorResponse } = require('../utils/response');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 'Foydalanuvchi roli aniqlanmadi.', 403);
    }

    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN') {
      return next();
    }

    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    // Buxgalter uchun moliya va xodimlar operatsiyalari ruxsati
    if (req.user?.isAccountant && (
      normalizedAllowed.includes('ACCOUNTANT') ||
      normalizedAllowed.includes('BUXGALTER') ||
      normalizedAllowed.includes('STAFF')
    )) {
      return next();
    }

    return errorResponse(
      res,
      "Sizda ushbu amalni bajarish uchun ruxsat yo'q! (Huquq cheklangan)",
      403
    );
  };
};

module.exports = {
  authorize
};
