const { Teacher, User, Branch, Group, Course, GroupStudent } = require("../../models");
const { validateTeacher } = require("./teacherValidation");
const { Op } = require("sequelize");

// 1. Yangi o'qituvchi qo'shish (Create)
exports.createTeacher = async (req, res) => {
    const { error } = validateTeacher(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const teacherData = { ...req.body };

        // user_id mavjudligini tekshirish (404)
        const user = await User.findByPk(teacherData.user_id);
        if (!user) {
            return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
        }

        // branch_id berilgan bo'lsa, mavjudligini tekshirish (404)
        if (teacherData.branch_id) {
            const branch = await Branch.findByPk(teacherData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        } else {
            teacherData.branch_id = null;
        }

        const teacher = await Teacher.create(teacherData);
        res.status(201).send(teacher);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha o'qituvchilarni olish (Read All)
exports.getTeacher = async (req, res) => {
    try {
        const teachers = await Teacher.findAll({
            include: [
                User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar", "plain_password"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
                Group ? {
                    model: Group,
                    as: "groups",
                    attributes: ["id", "name", "course_id", "teacher_id", "status"],
                    include: [
                        Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
                        GroupStudent ? { model: GroupStudent, as: "group_students", attributes: ["id", "student_id"] } : null
                    ].filter(Boolean)
                } : null,
                Course ? { model: Course, as: "courses", attributes: ["id", "name"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(teachers);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha o'qituvchini olish (Read One)
exports.getTeacherById = async (req, res) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id, {
            include: [
                User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar", "plain_password"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
                Group ? {
                    model: Group,
                    as: "groups",
                    attributes: ["id", "name", "course_id", "teacher_id", "status"],
                    include: [
                        Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
                        GroupStudent ? { model: GroupStudent, as: "group_students", attributes: ["id", "student_id"] } : null
                    ].filter(Boolean)
                } : null,
                Course ? { model: Course, as: "courses", attributes: ["id", "name"] } : null
            ].filter(Boolean)
        });
        if (!teacher) return res.status(404).send("Teacher not found");
        res.status(200).send(teacher);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. O'qituvchi ma'lumotlarini yangilash (Update)
exports.updateTeacher = async (req, res) => {
    const { error } = validateTeacher(req.body, true);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const teacher = await Teacher.findByPk(req.params.id);
        if (!teacher) return res.status(404).send("Teacher not found");

        const updateData = { ...req.body };

        // user_id o'zgargan bo'lsa, tekshirish (404)
        if (updateData.user_id) {
            const user = await User.findByPk(updateData.user_id);
            if (!user) {
                return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
            }
        }

        // branch_id o'zgargan bo'lsa, tekshirish (404)
        if (updateData.branch_id) {
            const branch = await Branch.findByPk(updateData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        }

        await teacher.update(updateData);

        // Agar status yoki branch_id o'zgargan bo'lsa, bog'liq User hisobini ham sinxronlash
        if (teacher.user_id && User) {
            const userSync = {};
            if (updateData.status) userSync.status = updateData.status;
            if (updateData.branch_id !== undefined) userSync.branch_id = updateData.branch_id;
            if (Object.keys(userSync).length > 0) {
                await User.update(userSync, { where: { id: teacher.user_id } }).catch(() => {});
            }
        }

        res.status(200).send(teacher);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. O'qituvchini o'chirish (Delete)
exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id);
        if (!teacher) return res.status(404).send("Teacher not found");

        const data = teacher.toJSON();
        const userId = teacher.user_id;

        // Bog'liq jadvallardan o'qituvchini ajratish
        const { Lesson: Lsn, TrialLesson: TL, Exam: Exm } = require("../../models");
        if (Lsn) await Lsn.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});
        if (TL) await TL.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});
        if (Group) await Group.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});
        if (Course) await Course.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});
        if (Exm) await Exm.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});

        // O'qituvchi profilini o'chirish
        await teacher.destroy();

        // O'qituvchining asosiy User hisobini ham butunlay o'chirish (umuman login qila olmasligi uchun)
        if (userId && User) {
            await User.destroy({ where: { id: userId } }).catch(async () => {
                await User.update({ status: 'inactive' }, { where: { id: userId } }).catch(() => {});
            });
        }

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. O'qituvchilarni qidirish (Search)
exports.searchTeacher = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const teachers = await Teacher.findAll({
            where: {
                [Op.or]: [
                    { specialization: { [Op.iLike]: `%${query}%` } },
                    { bio: { [Op.iLike]: `%${query}%` } },
                    { salary_type: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar", "plain_password"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null
            ].filter(Boolean)
        });
        res.status(200).send(teachers);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
