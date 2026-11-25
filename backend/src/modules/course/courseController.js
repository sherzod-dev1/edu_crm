const { 
    Course, 
    Branch, 
    Teacher,
    User,
    CourseModule, 
    Group, 
    GroupStudent, 
    Lesson, 
    Attendance, 
    TrialLesson, 
    Lead, 
    Exam, 
    Certificate, 
    Invoice 
} = require("../../models");
const { validateCourse } = require("./courseValidation");
const { syncCoursesToGroups } = require("../../syncCoursesToGroups");
const { Op } = require("sequelize");

// Slug generatsiya qiluvchi yordamchi funksiya
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);
};

// 1. Yangi kurs qo'shish (Create)
exports.createCourse = async (req, res) => {
    const { error } = validateCourse(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const courseData = { ...req.body };

        // branch_id berilgan bo'lsa, mavjudligini tekshirish (404)
        if (courseData.branch_id) {
            const branch = await Branch.findByPk(courseData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        } else {
            courseData.branch_id = null;
        }

        // teacher_id berilgan bo'lsa, tekshirish (404)
        if (courseData.teacher_id) {
            const teacher = await Teacher.findByPk(courseData.teacher_id);
            if (!teacher) {
                return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
            }
        } else {
            courseData.teacher_id = null;
        }

        // Agar slug berilmagan bo'lsa, nomidan avtomatik generatsiya qilish
        if (!courseData.slug) {
            courseData.slug = generateSlug(courseData.name);
        }

        if (courseData.lesson_time && !courseData.start_time) {
            courseData.start_time = courseData.lesson_time;
        } else if (courseData.start_time && !courseData.lesson_time) {
            courseData.lesson_time = courseData.start_time;
        }

        const course = await Course.create(courseData);
        syncCoursesToGroups().catch(() => {});
        res.status(201).send(course);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha kurslarni olish (Read All)
exports.getCourse = async (req, res) => {
    try {
        const courses = await Course.findAll({
            include: [
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
                Teacher ? {
                    model: Teacher,
                    as: "teacher",
                    attributes: ["id", "specialization"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email"] }] : []
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(courses);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha kursni olish (Read One)
exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, {
            include: [
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
                Teacher ? {
                    model: Teacher,
                    as: "teacher",
                    attributes: ["id", "specialization"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email"] }] : []
                } : null
            ].filter(Boolean)
        });
        if (!course) return res.status(404).send("Course not found");
        res.status(200).send(course);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Kurs ma'lumotlarini yangilash (Update)
exports.updateCourse = async (req, res) => {
    const { error } = validateCourse(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).send("Course not found");

        const updateData = { ...req.body };

        // branch_id o'zgargan bo'lsa, tekshirish (404)
        if (updateData.branch_id) {
            const branch = await Branch.findByPk(updateData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        }

        // teacher_id o'zgargan bo'lsa, tekshirish (404)
        if (updateData.teacher_id) {
            const teacher = await Teacher.findByPk(updateData.teacher_id);
            if (!teacher) {
                return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
            }
        }

        if (updateData.name && !updateData.slug) {
            updateData.slug = generateSlug(updateData.name);
        }

        if (updateData.lesson_time !== undefined && updateData.start_time === undefined) {
            updateData.start_time = updateData.lesson_time;
        } else if (updateData.start_time !== undefined && updateData.lesson_time === undefined) {
            updateData.lesson_time = updateData.start_time;
        }

        await course.update(updateData);
        syncCoursesToGroups().catch(() => {});
        res.status(200).send(course);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Kursni o'chirish (Delete)
exports.deleteCourse = async (req, res) => {
    const t = await Course.sequelize.transaction();
    try {
        const course = await Course.findByPk(req.params.id, { transaction: t });
        if (!course) {
            await t.rollback();
            return res.status(404).json({ message: "Kurs topilmadi" });
        }

        const courseId = course.id;

        // 1. Leads - qiziqqan kursini bo'shatish (bog'liqlikni uzish)
        if (Lead) {
            await Lead.update(
                { interested_course_id: null },
                { where: { interested_course_id: courseId }, transaction: t }
            );
        }

        // 2. Exams - kurs bo'yicha imtihonlarni bog'liqlikdan yechish
        if (Exam) {
            await Exam.update(
                { course_id: null },
                { where: { course_id: courseId }, transaction: t }
            );
        }

        // 3. Certificates - kurs sertifikatlarini tozalash
        if (Certificate) {
            await Certificate.destroy({
                where: { course_id: courseId },
                transaction: t
            });
        }

        // 4. Trial lessons - kurs sinov darslarini tozalash
        if (TrialLesson) {
            await TrialLesson.destroy({
                where: { course_id: courseId },
                transaction: t
            });
        }

        // 5. Course modules - kurs modullarini o'chirish
        if (CourseModule) {
            await CourseModule.destroy({
                where: { course_id: courseId },
                transaction: t
            });
        }

        // 6. Guruhlar va ularning darslari, davomatlari va talabalarini tozalash
        if (Group) {
            const groups = await Group.findAll({
                where: { course_id: courseId },
                attributes: ['id'],
                transaction: t
            });

            const groupIds = groups.map(g => g.id);

            if (groupIds.length > 0) {
                // Guruh darslari
                if (Lesson) {
                    const lessons = await Lesson.findAll({
                        where: { group_id: groupIds },
                        attributes: ['id'],
                        transaction: t
                    });
                    const lessonIds = lessons.map(l => l.id);

                    // Darslar davomatini o'chirish
                    if (Attendance && lessonIds.length > 0) {
                        await Attendance.destroy({
                            where: { lesson_id: lessonIds },
                            transaction: t
                        });
                    }

                    // Darslarni o'chirish
                    await Lesson.destroy({
                        where: { group_id: groupIds },
                        transaction: t
                    });
                }

                // Guruhdagi talabalarni chiqarish
                if (GroupStudent) {
                    await GroupStudent.destroy({
                        where: { group_id: groupIds },
                        transaction: t
                    });
                }

                // Invoyslardagi group_id ni null qilish
                if (Invoice) {
                    await Invoice.update(
                        { group_id: null },
                        { where: { group_id: groupIds }, transaction: t }
                    );
                }

                // Imtihonlardagi group_id ni null qilish
                if (Exam) {
                    await Exam.update(
                        { group_id: null },
                        { where: { group_id: groupIds }, transaction: t }
                    );
                }

                // Guruhlarni o'chirish
                await Group.destroy({
                    where: { id: groupIds },
                    transaction: t
                });
            }
        }

        // 7. Kursni o'chirish
        const data = course.toJSON();
        await course.destroy({ transaction: t });

        await t.commit();
        res.status(200).json(data);
    } catch (err) {
        await t.rollback();
        console.error("deleteCourse error:", err);
        res.status(500).json({ message: err.message || "Kursni o'chirishda xatolik yuz berdi" });
    }
};

// 6. Kurslarni qidirish (Search)
exports.searchCourse = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const courses = await Course.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${query}%` } },
                    { slug: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                    { level: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: Branch ? [{ model: Branch, as: "branch", attributes: ["id", "name"] }] : []
        });
        res.status(200).send(courses);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
