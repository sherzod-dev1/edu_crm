const { ExamResult, Exam, Student, User, Group, Course } = require("../../models");
const { validateExamResult } = require("./examResultValidation");
const { Op } = require("sequelize");

// Bahoni foiz bo'yicha hisoblash yordamchisi
const calculateGrade = (percent) => {
    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 70) return 'C';
    if (percent >= 60) return 'D';
    return 'F';
};

// 1. Yangi imtihon natijasini kiritish (Create)
exports.createExamResult = async (req, res) => {
    const { error } = validateExamResult(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const resultData = { ...req.body };

        // exam_id mavjudligini tekshirish (404)
        const exam = await Exam.findByPk(resultData.exam_id);
        if (!exam) {
            return res.status(404).send("Belgilangan exam_id ga ega imtihon topilmadi");
        }

        // student_id mavjudligini tekshirish (404)
        const student = await Student.findByPk(resultData.student_id);
        if (!student) {
            return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
        }

        // created_by berilgan bo'lsa tekshirish (404)
        if (resultData.created_by) {
            const user = await User.findByPk(resultData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        } else {
            resultData.created_by = null;
        }

        const score = Number(resultData.score);
        const maxScore = Number(exam.max_score) || 100;
        const passingScore = Number(exam.passing_score) || 60;

        // Foizni avtomatik hisoblash
        if (resultData.percentage === undefined || resultData.percentage === null) {
            resultData.percentage = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;
        }

        // O'tgan / o'tmaganligini aniqlash
        if (resultData.passed === undefined || resultData.passed === null) {
            resultData.passed = score >= passingScore;
        }

        // Bahoni aniqlash
        if (!resultData.grade) {
            resultData.grade = calculateGrade(resultData.percentage);
        }

        const examResult = await ExamResult.create(resultData);
        res.status(201).send(examResult);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha imtihon natijalarini olish (Read All)
exports.getExamResult = async (req, res) => {
    try {
        const examResults = await ExamResult.findAll({
            include: [
                Exam ? { 
                    model: Exam, 
                    as: "exam", 
                    attributes: ["id", "title", "exam_date", "max_score", "passing_score", "status"],
                    include: [
                        Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
                        Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
                    ].filter(Boolean)
                } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(examResults);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta imtihon natijasini olish (Read One)
exports.getExamResultById = async (req, res) => {
    try {
        const examResult = await ExamResult.findByPk(req.params.id, {
            include: [
                Exam ? { 
                    model: Exam, 
                    as: "exam", 
                    attributes: ["id", "title", "exam_date", "max_score", "passing_score", "status"],
                    include: [
                        Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
                        Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
                    ].filter(Boolean)
                } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean)
        });
        if (!examResult) return res.status(404).send("ExamResult not found");
        res.status(200).send(examResult);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Imtihon natijasi ma'lumotlarini yangilash (Update)
exports.updateExamResult = async (req, res) => {
    const { error } = validateExamResult(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const examResult = await ExamResult.findByPk(req.params.id);
        if (!examResult) return res.status(404).send("ExamResult not found");

        const updateData = { ...req.body };

        if (updateData.exam_id) {
            const exam = await Exam.findByPk(updateData.exam_id);
            if (!exam) {
                return res.status(404).send("Belgilangan exam_id ga ega imtihon topilmadi");
            }
        }

        if (updateData.student_id) {
            const student = await Student.findByPk(updateData.student_id);
            if (!student) {
                return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
            }
        }

        if (updateData.created_by) {
            const user = await User.findByPk(updateData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        }

        await examResult.update(updateData);
        res.status(200).send(examResult);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Imtihon natijasini o'chirish (Delete)
exports.deleteExamResult = async (req, res) => {
    try {
        const examResult = await ExamResult.findByPk(req.params.id);
        if (!examResult) return res.status(404).send("ExamResult not found");

        const data = examResult.toJSON();
        await examResult.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Imtihon natijalarini qidirish (Search)
exports.searchExamResult = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const examResults = await ExamResult.findAll({
            where: {
                [Op.or]: [
                    { grade: { [Op.iLike]: `%${query}%` } },
                    { comment: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Exam ? { model: Exam, as: "exam", attributes: ["id", "title"] } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(examResults);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
