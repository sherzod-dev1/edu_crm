const { GroupStudent, Group, Student, User, Course } = require("../../models");
const { validateGroupStudent } = require("./groupStudentValidation");
const { Op } = require("sequelize");

// 1. Guruhga talaba biriktirish (Create)
exports.createGroupStudent = async (req, res) => {
    const { error } = validateGroupStudent(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const { group_id, student_id } = req.body;

        // group_id mavjudligini tekshirish (404)
        const group = await Group.findByPk(group_id);
        if (!group) {
            return res.status(404).send("Belgilangan group_id ga ega guruh topilmadi");
        }

        // student_id mavjudligini tekshirish (404)
        const student = await Student.findByPk(student_id);
        if (!student) {
            return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
        }

        const groupStudent = await GroupStudent.create(req.body);

        // Sinxron ravishda Student modelidagi group_id va course_id ni yangilash
        await student.update({
            group_id: group.id,
            course_id: group.course_id || student.course_id
        }).catch(() => {});

        res.status(201).send(groupStudent);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha guruh talabalarini olish (Read All)
exports.getGroupStudent = async (req, res) => {
    try {
        const groupStudents = await GroupStudent.findAll({
            include: [
                Group ? { 
                    model: Group, 
                    as: "group", 
                    attributes: ["id", "name", "days", "start_time", "end_time", "status"],
                    include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
                } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(groupStudents);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha guruh talabasini olish (Read One)
exports.getGroupStudentById = async (req, res) => {
    try {
        const groupStudent = await GroupStudent.findByPk(req.params.id, {
            include: [
                Group ? { 
                    model: Group, 
                    as: "group", 
                    attributes: ["id", "name", "days", "start_time", "end_time", "status"],
                    include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
                } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null
            ].filter(Boolean)
        });
        if (!groupStudent) return res.status(404).send("GroupStudent not found");
        res.status(200).send(groupStudent);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Guruh talabasi ma'lumotlarini yangilash (Update)
exports.updateGroupStudent = async (req, res) => {
    const { error } = validateGroupStudent(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const groupStudent = await GroupStudent.findByPk(req.params.id);
        if (!groupStudent) return res.status(404).send("GroupStudent not found");

        const updateData = { ...req.body };

        if (updateData.group_id) {
            const group = await Group.findByPk(updateData.group_id);
            if (!group) {
                return res.status(404).send("Belgilangan group_id ga ega guruh topilmadi");
            }
        }

        if (updateData.student_id) {
            const student = await Student.findByPk(updateData.student_id);
            if (!student) {
                return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
            }
        }

        await groupStudent.update(updateData);
        res.status(200).send(groupStudent);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Talabani guruhdan o'chirish (Delete)
exports.deleteGroupStudent = async (req, res) => {
    try {
        const groupStudent = await GroupStudent.findByPk(req.params.id);
        if (!groupStudent) return res.status(404).send("GroupStudent not found");

        const data = groupStudent.toJSON();
        await groupStudent.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Guruh talabalarini qidirish (Search)
exports.searchGroupStudent = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const groupStudents = await GroupStudent.findAll({
            where: {
                [Op.or]: [
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(groupStudents);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
