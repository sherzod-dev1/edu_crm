const { TrialLesson, Lead, Course, Teacher, Branch, Classroom, User } = require("../../models");
const { validateTrialLesson } = require("./trialLessonValidation");
const { Op } = require("sequelize");

// 1. Yangi sinov darsi yaratish (Create)
exports.createTrialLesson = async (req, res) => {
    const { error } = validateTrialLesson(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const trialData = { ...req.body };

        // lead_id mavjudligini tekshirish (404)
        const lead = await Lead.findByPk(trialData.lead_id);
        if (!lead) {
            return res.status(404).send("Belgilangan lead_id ga ega lid topilmadi");
        }

        // course_id mavjudligini tekshirish (404)
        const course = await Course.findByPk(trialData.course_id);
        if (!course) {
            return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
        }

        // teacher_id mavjudligini tekshirish (404)
        if (trialData.teacher_id) {
            const teacher = await Teacher.findByPk(trialData.teacher_id);
            if (!teacher) {
                return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
            }
        } else {
            trialData.teacher_id = null;
        }

        // branch_id mavjudligini tekshirish (404)
        if (trialData.branch_id) {
            const branch = await Branch.findByPk(trialData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        } else {
            trialData.branch_id = null;
        }

        // classroom_id mavjudligini tekshirish (404)
        if (trialData.classroom_id) {
            const classroom = await Classroom.findByPk(trialData.classroom_id);
            if (!classroom) {
                return res.status(404).send("Belgilangan classroom_id ga ega xona topilmadi");
            }
        } else {
            trialData.classroom_id = null;
        }

        // created_by mavjudligini tekshirish (404)
        if (trialData.created_by) {
            const user = await User.findByPk(trialData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        } else {
            trialData.created_by = null;
        }

        const trialLesson = await TrialLesson.create(trialData);
        res.status(201).send(trialLesson);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha sinov darslarini olish (Read All)
exports.getTrialLesson = async (req, res) => {
    try {
        const trialLessons = await TrialLesson.findAll({
            include: [
                Lead ? { model: Lead, as: "lead", attributes: ["id", "full_name", "phone", "email", "status"] } : null,
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "price"] } : null,
                Teacher ? { 
                    model: Teacher, 
                    as: "teacher", 
                    attributes: ["id", "specialization"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone"] }] : []
                } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address"] } : null,
                Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "floor", "capacity"] } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null,
            ].filter(Boolean),
            order: [['trial_date', 'DESC'], ['created_at', 'DESC']]
        });
        res.status(200).send(trialLessons);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta sinov darsini olish (Read One)
exports.getTrialLessonById = async (req, res) => {
    try {
        const trialLesson = await TrialLesson.findByPk(req.params.id, {
            include: [
                Lead ? { model: Lead, as: "lead", attributes: ["id", "full_name", "phone", "email", "status"] } : null,
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "price"] } : null,
                Teacher ? { 
                    model: Teacher, 
                    as: "teacher", 
                    attributes: ["id", "specialization"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone"] }] : []
                } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address"] } : null,
                Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "floor", "capacity"] } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null,
            ].filter(Boolean)
        });
        if (!trialLesson) return res.status(404).send("TrialLesson not found");
        res.status(200).send(trialLesson);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Sinov darsi ma'lumotlarini yangilash (Update)
exports.updateTrialLesson = async (req, res) => {
    const { error } = validateTrialLesson(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const trialLesson = await TrialLesson.findByPk(req.params.id);
        if (!trialLesson) return res.status(404).send("TrialLesson not found");

        const updateData = { ...req.body };

        if (updateData.lead_id) {
            const lead = await Lead.findByPk(updateData.lead_id);
            if (!lead) {
                return res.status(404).send("Belgilangan lead_id ga ega lid topilmadi");
            }
        }

        if (updateData.course_id) {
            const course = await Course.findByPk(updateData.course_id);
            if (!course) {
                return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
            }
        }

        if (updateData.teacher_id) {
            const teacher = await Teacher.findByPk(updateData.teacher_id);
            if (!teacher) {
                return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
            }
        }

        if (updateData.branch_id) {
            const branch = await Branch.findByPk(updateData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        }

        if (updateData.classroom_id) {
            const classroom = await Classroom.findByPk(updateData.classroom_id);
            if (!classroom) {
                return res.status(404).send("Belgilangan classroom_id ga ega xona topilmadi");
            }
        }

        if (updateData.created_by) {
            const user = await User.findByPk(updateData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        }

        await trialLesson.update(updateData);
        res.status(200).send(trialLesson);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Sinov darsini o'chirish (Delete)
exports.deleteTrialLesson = async (req, res) => {
    try {
        const trialLesson = await TrialLesson.findByPk(req.params.id);
        if (!trialLesson) return res.status(404).send("TrialLesson not found");

        const data = trialLesson.toJSON();
        await trialLesson.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Sinov darslarini qidirish (Search)
exports.searchTrialLesson = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const trialLessons = await TrialLesson.findAll({
            where: {
                [Op.or]: [
                    { status: { [Op.iLike]: `%${query}%` } },
                    { feedback: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Lead ? { model: Lead, as: "lead", attributes: ["id", "full_name", "phone"] } : null,
                Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null
            ].filter(Boolean),
            order: [['trial_date', 'DESC']]
        });
        res.status(200).send(trialLessons);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
