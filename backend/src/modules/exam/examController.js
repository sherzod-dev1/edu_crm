const { Exam, Course, Group, CourseModule, Teacher, User } = require("../../models");
const { validateExam } = require("./examValidation");
const { Op } = require("sequelize");

// 1. Yangi imtihon yaratish (Create)
exports.createExam = async (req, res) => {
    const { error } = validateExam(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const examData = { ...req.body };

        // course_id berilgan bo'lsa tekshirish (404)
        if (examData.course_id) {
            const course = await Course.findByPk(examData.course_id);
            if (!course) {
                return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
            }
        } else {
            examData.course_id = null;
        }

        // group_id berilgan bo'lsa tekshirish (404)
        if (examData.group_id) {
            const group = await Group.findByPk(examData.group_id);
            if (!group) {
                return res.status(404).send("Belgilangan group_id ga ega guruh topilmadi");
            }
        } else {
            examData.group_id = null;
        }

        // module_id berilgan bo'lsa tekshirish (404)
        if (examData.module_id) {
            const module = await CourseModule.findByPk(examData.module_id);
            if (!module) {
                return res.status(404).send("Belgilangan module_id ga ega modul topilmadi");
            }
        } else {
            examData.module_id = null;
        }

        // teacher_id berilgan bo'lsa tekshirish (yoki guruhdan avtomatik olish)
        if (examData.teacher_id) {
            let teacher = await Teacher.findByPk(examData.teacher_id);
            if (!teacher) {
                teacher = await Teacher.findOne({ where: { user_id: examData.teacher_id } });
                if (teacher) {
                    examData.teacher_id = teacher.id;
                } else {
                    return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
                }
            }
        } else if (examData.group_id) {
            const group = await Group.findByPk(examData.group_id);
            if (group && group.teacher_id) {
                examData.teacher_id = group.teacher_id;
            } else {
                examData.teacher_id = null;
            }
        } else {
            examData.teacher_id = null;
        }

        const exam = await Exam.create(examData);
        res.status(201).send(exam);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha imtihonlarni olish (Read All)
exports.getExam = async (req, res) => {
    try {
        const exams = await Exam.findAll({
            include: [
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug"] } : null,
                Group ? { model: Group, as: "group", attributes: ["id", "name", "days"] } : null,
                CourseModule ? { model: CourseModule, as: "module", attributes: ["id", "title", "order_number"] } : null,
                Teacher ? { 
                    model: Teacher, 
                    as: "teacher", 
                    attributes: ["id", "specialization"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null
            ].filter(Boolean),
            order: [['exam_date', 'DESC'], ['created_at', 'DESC']]
        });
        res.status(200).send(exams);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta imtihonni olish (Read One)
exports.getExamById = async (req, res) => {
    try {
        const exam = await Exam.findByPk(req.params.id, {
            include: [
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug"] } : null,
                Group ? { model: Group, as: "group", attributes: ["id", "name", "days"] } : null,
                CourseModule ? { model: CourseModule, as: "module", attributes: ["id", "title", "order_number"] } : null,
                Teacher ? { 
                    model: Teacher, 
                    as: "teacher", 
                    attributes: ["id", "specialization"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null
            ].filter(Boolean)
        });
        if (!exam) return res.status(404).send("Exam not found");
        res.status(200).send(exam);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Imtihon ma'lumotlarini yangilash (Update)
exports.updateExam = async (req, res) => {
    const { error } = validateExam(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const exam = await Exam.findByPk(req.params.id);
        if (!exam) return res.status(404).send("Exam not found");

        const updateData = { ...req.body };

        if (updateData.course_id) {
            const course = await Course.findByPk(updateData.course_id);
            if (!course) {
                return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
            }
        }

        if (updateData.group_id) {
            const group = await Group.findByPk(updateData.group_id);
            if (!group) {
                return res.status(404).send("Belgilangan group_id ga ega guruh topilmadi");
            }
        }

        if (updateData.module_id) {
            const module = await CourseModule.findByPk(updateData.module_id);
            if (!module) {
                return res.status(404).send("Belgilangan module_id ga ega modul topilmadi");
            }
        }

        if (updateData.teacher_id) {
            let teacher = await Teacher.findByPk(updateData.teacher_id);
            if (!teacher) {
                teacher = await Teacher.findOne({ where: { user_id: updateData.teacher_id } });
                if (teacher) {
                    updateData.teacher_id = teacher.id;
                } else {
                    return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
                }
            }
        } else if (updateData.group_id) {
            const group = await Group.findByPk(updateData.group_id);
            if (group && group.teacher_id) {
                updateData.teacher_id = group.teacher_id;
            }
        }

        await exam.update(updateData);
        res.status(200).send(exam);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Imtihonni o'chirish (Delete)
exports.deleteExam = async (req, res) => {
    try {
        const exam = await Exam.findByPk(req.params.id);
        if (!exam) return res.status(404).send("Exam not found");

        const data = exam.toJSON();
        await exam.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Imtihonlarni qidirish (Search)
exports.searchExam = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const exams = await Exam.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
                Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
            ].filter(Boolean),
            order: [['exam_date', 'DESC']]
        });
        res.status(200).send(exams);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
