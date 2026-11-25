const teacherAttendanceService = require('./teacherAttendanceService');
const { validateTeacherAttendance } = require('./teacherAttendanceValidation');
const { verifyToken } = require('../../utils/auth');
const { User } = require('../../models');

async function getCallerRole(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const caller = await User.findByPk(decoded.id);
        return (caller?.role || '').toUpperCase();
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

// 1. Yangi davomat yaratish yoki yangilash (Create / Upsert)
exports.createTeacherAttendance = async (req, res) => {
  const callerRole = await getCallerRole(req);
  if (callerRole === 'TEACHER' || callerRole === 'STUDENT') {
    return res.status(403).json({ success: false, message: "O'qituvchilar davomatini boshqarish faqat ma'muriyat va nazoratchilar uchun ruxsat etilgan." });
  }

  const { error } = validateTeacherAttendance(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  try {
    const result = await teacherAttendanceService.createOrUpdate(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Bir nechta davomatlarni saqlash (Bulk Upsert)
exports.bulkTeacherAttendance = async (req, res) => {
  const callerRole = await getCallerRole(req);
  if (callerRole === 'TEACHER' || callerRole === 'STUDENT') {
    return res.status(403).json({ success: false, message: "O'qituvchilar davomatini boshqarish faqat ma'muriyat va nazoratchilar uchun ruxsat etilgan." });
  }

  const { items, meta } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "items massivi talab qilinadi" });
  }

  try {
    const results = await teacherAttendanceService.bulkUpsert(items, meta || {});
    res.status(200).json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Barcha o'qituvchilar davomatini olish (Read All)
exports.getTeacherAttendance = async (req, res) => {
  const callerRole = await getCallerRole(req);
  if (callerRole === 'TEACHER' || callerRole === 'STUDENT') {
    return res.status(403).json({ success: false, message: "O'qituvchilar davomati va oylik hisoboti faqat ma'muriyat uchun ruxsat etilgan." });
  }

  try {
    const attendances = await teacherAttendanceService.getAll(req.query);
    res.status(200).json({ success: true, data: attendances });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. ID bo'yicha bitta davomat yozuvini olish (Read One)
exports.getTeacherAttendanceById = async (req, res) => {
  try {
    const attendance = await teacherAttendanceService.getById(req.params.id);
    res.status(200).json({ success: true, data: attendance });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// 5. Davomat yozuvini yangilash (Update)
exports.updateTeacherAttendance = async (req, res) => {
  try {
    const updated = await teacherAttendanceService.update(req.params.id, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Davomat yozuvini o'chirish (Delete)
exports.deleteTeacherAttendance = async (req, res) => {
  try {
    const result = await teacherAttendanceService.delete(req.params.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7. Davomat statistikasi (Stats)
exports.getTeacherAttendanceStats = async (req, res) => {
  const callerRole = await getCallerRole(req);
  if (callerRole === 'TEACHER' || callerRole === 'STUDENT') {
    return res.status(403).json({ success: false, message: "Ruxsat etilmagan." });
  }

  try {
    const stats = await teacherAttendanceService.getStats(req.query);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 8. Buxgalteriya oylik hisoboti (Payroll & Deductions Report)
exports.getPayrollReport = async (req, res) => {
  const callerRole = await getCallerRole(req);
  if (callerRole === 'TEACHER' || callerRole === 'STUDENT') {
    return res.status(403).json({ success: false, message: "Ruxsat etilmagan." });
  }

  try {
    const report = await teacherAttendanceService.getPayrollReport(req.query);
    res.status(200).json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 9. Kelajak sanalaridagi noto'g'ri yozuvlarni tozalash (Cleanup)
exports.cleanupFutureTeacherAttendances = async (req, res) => {
  try {
    const result = await teacherAttendanceService.cleanupFutureRecords();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

