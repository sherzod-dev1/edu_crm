const { Classroom, Branch } = require("../../models");
const { validateClassroom } = require("./classroomValidation");
const { Op } = require("sequelize");

// 1. Yangi xona yaratish (Create)
exports.createClassroom = async (req, res) => {
    const { error } = validateClassroom(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const classroomData = { ...req.body };

        // branch_id berilgan bo'lsa, mavjudligini tekshirish (404)
        if (classroomData.branch_id) {
            const branch = await Branch.findByPk(classroomData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        } else {
            classroomData.branch_id = null;
        }

        const classroom = await Classroom.create(classroomData);
        res.status(201).send(classroom);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha xonalarni olish (Read All)
exports.getClassroom = async (req, res) => {
    try {
        const classrooms = await Classroom.findAll({
            include: Branch ? [{ model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] }] : [],
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(classrooms);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta xonani olish (Read One)
exports.getClassroomById = async (req, res) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id, {
            include: Branch ? [{ model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] }] : []
        });
        if (!classroom) return res.status(404).send("Classroom not found");
        res.status(200).send(classroom);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Xona ma'lumotlarini yangilash (Update)
exports.updateClassroom = async (req, res) => {
    const { error } = validateClassroom(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return res.status(404).send("Classroom not found");

        const updateData = { ...req.body };

        // branch_id o'zgargan bo'lsa, tekshirish (404)
        if (updateData.branch_id) {
            const branch = await Branch.findByPk(updateData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        }

        await classroom.update(updateData);
        res.status(200).send(classroom);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Xonani o'chirish (Delete)
exports.deleteClassroom = async (req, res) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return res.status(404).send("Classroom not found");

        const data = classroom.toJSON();
        await classroom.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Xonalarni qidirish (Search)
exports.searchClassroom = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const classrooms = await Classroom.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${query}%` } },
                    { room_type: { [Op.iLike]: `%${query}%` } },
                    { equipment: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: Branch ? [{ model: Branch, as: "branch", attributes: ["id", "name"] }] : [],
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(classrooms);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
