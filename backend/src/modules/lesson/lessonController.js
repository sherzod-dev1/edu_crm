const { Lesson, Group, Teacher, Classroom, CourseModule, User, Course } = require("../../models");
const { validateLesson } = require("./lessonValidation");
const { Op } = require("sequelize");

// 1. Yangi dars yaratish (Create)
exports.createLesson = async (req, res) => {
    const { error } = validateLesson(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const lessonData = { ...req.body };

        // group_id mavjudligini tekshirish (404)
        const group = await Group.findByPk(lessonData.group_id);
        if (!group) {
            return res.status(404).send("Belgilangan group_id ga ega guruh topilmadi");
        }

        // teacher_id berilgan bo'lsa tekshirish (404)
        if (lessonData.teacher_id) {
            const teacher = await Teacher.findByPk(lessonData.teacher_id);
            if (!teacher) {
                return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
            }
        } else {
            lessonData.teacher_id = null;
        }

        // classroom_id berilgan bo'lsa tekshirish (404)
        if (lessonData.classroom_id) {
            const classroom = await Classroom.findByPk(lessonData.classroom_id);
            if (!classroom) {
                return res.status(404).send("Belgilangan classroom_id ga ega xona topilmadi");
            }
        } else {
            lessonData.classroom_id = null;
        }

        // module_id berilgan bo'lsa tekshirish (404)
        if (lessonData.module_id) {
            const module = await CourseModule.findByPk(lessonData.module_id);
            if (!module) {
                return res.status(404).send("Belgilangan module_id ga ega modul topilmadi");
            }
        } else {
            lessonData.module_id = null;
        }

        // O'qituvchining vaqt to'qnashuvini (conflict) tekshirish
        const finalTeacherId = lessonData.teacher_id || group.teacher_id;
        if (finalTeacherId && lessonData.lesson_date && lessonData.start_time && lessonData.end_time) {
            const conflictLesson = await Lesson.findOne({
                where: {
                    teacher_id: finalTeacherId,
                    lesson_date: lessonData.lesson_date,
                    start_time: { [Op.lt]: lessonData.end_time },
                    end_time: { [Op.gt]: lessonData.start_time }
                },
                include: [{ model: Group, as: "group", attributes: ["name"] }]
            });

            if (conflictLesson) {
                const grpName = conflictLesson.group?.name || "Boshqa guruh darsi";
                const sTime = conflictLesson.start_time ? String(conflictLesson.start_time).slice(0, 5) : "";
                const eTime = conflictLesson.end_time ? String(conflictLesson.end_time).slice(0, 5) : "";
                return res.status(400).send(
                    `O'qituvchining ushbu kunda soat ${sTime} dan ${eTime} gacha boshqa darsi mavjud (${grpName})! Iltimos, o'qituvchi bo'sh bo'lgan boshqa vaqtni tanlang.`
                );
            }
        }

        const lesson = await Lesson.create(lessonData);
        res.status(201).send(lesson);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha darslarni olish (Read All)
exports.getLesson = async (req, res) => {
    try {
        const lessons = await Lesson.findAll({
            include: [
                Group ? { 
                    model: Group, 
                    as: "group", 
                    attributes: ["id", "name", "days", "start_time", "end_time"],
                    include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
                } : null,
                Teacher ? { 
                    model: Teacher, 
                    as: "teacher", 
                    attributes: ["id", "user_id", "specialization"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "floor", "room_type"] } : null,
                CourseModule ? { model: CourseModule, as: "module", attributes: ["id", "title", "order_number"] } : null
            ].filter(Boolean),
            order: [['lesson_date', 'DESC'], ['start_time', 'ASC']]
        });
        res.status(200).send(lessons);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta darsni olish (Read One)
exports.getLessonById = async (req, res) => {
    try {
        const lesson = await Lesson.findByPk(req.params.id, {
            include: [
                Group ? { 
                    model: Group, 
                    as: "group", 
                    attributes: ["id", "name", "days", "start_time", "end_time"],
                    include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
                } : null,
                Teacher ? { 
                    model: Teacher, 
                    as: "teacher", 
                    attributes: ["id", "user_id", "specialization"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "floor", "room_type"] } : null,
                CourseModule ? { model: CourseModule, as: "module", attributes: ["id", "title", "order_number"] } : null
            ].filter(Boolean)
        });
        if (!lesson) return res.status(404).send("Lesson not found");
        res.status(200).send(lesson);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Dars ma'lumotlarini yangilash (Update)
exports.updateLesson = async (req, res) => {
    const { error } = validateLesson(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const lesson = await Lesson.findByPk(req.params.id);
        if (!lesson) return res.status(404).send("Lesson not found");

        const updateData = { ...req.body };

        if (updateData.group_id) {
            const group = await Group.findByPk(updateData.group_id);
            if (!group) {
                return res.status(404).send("Belgilangan group_id ga ega guruh topilmadi");
            }
        }

        if (updateData.teacher_id) {
            const teacher = await Teacher.findByPk(updateData.teacher_id);
            if (!teacher) {
                return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
            }
        }

        if (updateData.classroom_id) {
            const classroom = await Classroom.findByPk(updateData.classroom_id);
            if (!classroom) {
                return res.status(404).send("Belgilangan classroom_id ga ega xona topilmadi");
            }
        }

        if (updateData.module_id) {
            const module = await CourseModule.findByPk(updateData.module_id);
            if (!module) {
                return res.status(404).send("Belgilangan module_id ga ega modul topilmadi");
            }
        }

        // Yangilashda ham o'qituvchi dars to'qnashuvini tekshirish
        const finalTeacherId = updateData.teacher_id !== undefined ? updateData.teacher_id : lesson.teacher_id;
        const finalDate = updateData.lesson_date || lesson.lesson_date;
        const finalStart = updateData.start_time || lesson.start_time;
        const finalEnd = updateData.end_time || lesson.end_time;

        if (finalTeacherId && finalDate && finalStart && finalEnd) {
            const conflictLesson = await Lesson.findOne({
                where: {
                    id: { [Op.ne]: lesson.id },
                    teacher_id: finalTeacherId,
                    lesson_date: finalDate,
                    start_time: { [Op.lt]: finalEnd },
                    end_time: { [Op.gt]: finalStart }
                },
                include: [{ model: Group, as: "group", attributes: ["name"] }]
            });

            if (conflictLesson) {
                const grpName = conflictLesson.group?.name || "Boshqa guruh darsi";
                const sTime = conflictLesson.start_time ? String(conflictLesson.start_time).slice(0, 5) : "";
                const eTime = conflictLesson.end_time ? String(conflictLesson.end_time).slice(0, 5) : "";
                return res.status(400).send(
                    `O'qituvchining ushbu kunda soat ${sTime} dan ${eTime} gacha boshqa darsi mavjud (${grpName})! Iltimos, o'qituvchi bo'sh bo'lgan boshqa vaqtni tanlang.`
                );
            }
        }

        await lesson.update(updateData);
        res.status(200).send(lesson);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Darsni o'chirish (Delete)
exports.deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByPk(req.params.id);
        if (!lesson) return res.status(404).send("Lesson not found");

        const data = lesson.toJSON();
        await lesson.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Darslarni qidirish (Search)
exports.searchLesson = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const lessons = await Lesson.findAll({
            where: {
                [Op.or]: [
                    { topic: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null,
                Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name"] } : null
            ].filter(Boolean),
            order: [['lesson_date', 'DESC']]
        });
        res.status(200).send(lessons);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
