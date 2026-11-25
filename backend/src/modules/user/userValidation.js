const { body, validationResult } = require('express-validator');

// Validatsiya xatoliklarini ushlab, foydalanuvchiga qaytaruvchi funksiya
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Kiritilgan ma'lumotlarda xatolik bor",
            errors: errors.array()
        });
    }
    next();
};

// Yangi foydalanuvchi qo'shish uchun qoidalar
exports.validateCreateUser = [
    body('full_name')
        .notEmpty().withMessage("Ism-familiya kiritilishi shart")
        .isString().withMessage("Ism matn bo'lishi kerak")
        .isLength({ min: 3 }).withMessage("Ism kamida 3 ta belgidan iborat bo'lishi kerak"),

    body('phone')
        .notEmpty().withMessage("Telefon raqami kiritilishi shart"),

    body('password')
        .notEmpty().withMessage("Parol kiritilishi shart")
        .isLength({ min: 6 }).withMessage("Parol kamida 6 ta belgidan iborat bo'lishi kerak"),

    body('email')
        .optional()
        .isEmail().withMessage("To'g'ri email formatini kiriting"),

    body('role')
        .optional()
        .isIn(['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'MANAGER', 'TEACHER', 'STUDENT', 'STAFF']).withMessage("Noto'g'ri rol"),

    body('branch_id')
        .optional()
        .isInt().withMessage("branch_id butun son bo'lishi kerak"),

    body('is_active')
        .optional()
        .isBoolean().withMessage("is_active boolean bo'lishi kerak"),

    // Xatoliklarni tekshiruvchi funksiyani chaqirish
    validateRequest
];

// Userni yangilash uchun qoidalar
exports.validateUpdateUser = [
    body('full_name')
        .optional()
        .isString().withMessage("Ism matn bo'lishi kerak"),

    body('phone')
        .optional(),

    body('email')
        .optional()
        .isEmail().withMessage("To'g'ri email formatini kiriting"),

    body('role')
        .optional()
        .isIn(['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'MANAGER', 'TEACHER', 'STUDENT', 'STAFF']).withMessage("Noto'g'ri rol"),

    body('branch_id')
        .optional()
        .isInt().withMessage("branch_id butun son bo'lishi kerak"),

    body('is_active')
        .optional()
        .isBoolean().withMessage("is_active boolean bo'lishi kerak"),

    validateRequest
];

// Manual object validator for req.body validation in controller
exports.validateUser = (data, isUpdate = false) => {
    if (!isUpdate) {
        if (!data.full_name || typeof data.full_name !== 'string' || data.full_name.trim().length < 2) {
            return { error: { details: [{ message: "Ism kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
        }
        if (!data.phone) {
            return { error: { details: [{ message: "Telefon raqami kiritilishi shart" }] } };
        }
        if (!data.hashed_password && !data.password) {
            return { error: { details: [{ message: "Parol kiritilishi shart" }] } };
        }
    } else {
        if (data.full_name && (typeof data.full_name !== 'string' || data.full_name.trim().length < 2)) {
            return { error: { details: [{ message: "Ism kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
        }
    }
    return { error: null };
};

