const { Certificate, Student, Course, User } = require("../../models");
const { validateCertificate } = require("./certificateValidation");
const { Op } = require("sequelize");

// Avtomatik sertifikat raqami va tekshirish kodi yaratish
const generateCertNumber = () => {
    return 'CERT-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000);
};

const generateVerificationCode = () => {
    return 'VER-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

// 1. Yangi sertifikat berish (Create)
exports.createCertificate = async (req, res) => {
    const { error } = validateCertificate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const certData = { ...req.body };

        // student_id mavjudligini tekshirish (404)
        const student = await Student.findByPk(certData.student_id);
        if (!student) {
            return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
        }

        // course_id mavjudligini tekshirish (404)
        const course = await Course.findByPk(certData.course_id);
        if (!course) {
            return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
        }

        // created_by berilgan bo'lsa tekshirish (404)
        if (certData.created_by) {
            const user = await User.findByPk(certData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        } else {
            certData.created_by = null;
        }

        if (!certData.certificate_number) {
            certData.certificate_number = generateCertNumber();
        }

        if (!certData.verification_code) {
            certData.verification_code = generateVerificationCode();
        }

        const certificate = await Certificate.create(certData);
        res.status(201).send(certificate);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha sertifikatlarni olish (Read All)
exports.getCertificate = async (req, res) => {
    try {
        const certificates = await Certificate.findAll({
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "level"] } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(certificates);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta sertifikatni olish (Read One)
exports.getCertificateById = async (req, res) => {
    try {
        const certificate = await Certificate.findByPk(req.params.id, {
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "level"] } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean)
        });
        if (!certificate) return res.status(404).send("Certificate not found");
        res.status(200).send(certificate);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Sertifikat ma'lumotlarini yangilash (Update)
exports.updateCertificate = async (req, res) => {
    const { error } = validateCertificate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const certificate = await Certificate.findByPk(req.params.id);
        if (!certificate) return res.status(404).send("Certificate not found");

        const updateData = { ...req.body };

        if (updateData.student_id) {
            const student = await Student.findByPk(updateData.student_id);
            if (!student) {
                return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
            }
        }

        if (updateData.course_id) {
            const course = await Course.findByPk(updateData.course_id);
            if (!course) {
                return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
            }
        }

        if (updateData.created_by) {
            const user = await User.findByPk(updateData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        }

        await certificate.update(updateData);
        res.status(200).send(certificate);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Sertifikatni o'chirish (Delete)
exports.deleteCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findByPk(req.params.id);
        if (!certificate) return res.status(404).send("Certificate not found");

        const data = certificate.toJSON();
        await certificate.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Sertifikatlarni qidirish (Search)
exports.searchCertificate = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const certificates = await Certificate.findAll({
            where: {
                [Op.or]: [
                    { certificate_number: { [Op.iLike]: `%${query}%` } },
                    { verification_code: { [Op.iLike]: `%${query}%` } },
                    { title: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
                } : null,
                Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(certificates);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 7. Sertifikatni verifikatsiya qilish (Verify Code / Number)
exports.verifyCertificate = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code) {
            return res.status(400).send("Verification code or certificate number is required");
        }

        const certificate = await Certificate.findOne({
            where: {
                [Op.or]: [
                    { verification_code: code },
                    { certificate_number: code }
                ]
            },
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
                } : null,
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "level"] } : null
            ].filter(Boolean)
        });

        if (!certificate) {
            return res.status(404).send("Bunday kodga ega sertifikat topilmadi yoki haqiqiy emas");
        }

        res.status(200).send({
            valid: true,
            certificate
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};
