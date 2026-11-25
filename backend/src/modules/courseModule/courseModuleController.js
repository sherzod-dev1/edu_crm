const { CourseModule, Course } = require("../../models");
const { validateCourseModule } = require("./courseModuleValidation");
const { Op } = require("sequelize");

// 1. Yangi modul qo'shish (Create)
exports.createCourseModule = async (req, res) => {
    const { error } = validateCourseModule(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const moduleData = { ...req.body };

        // course_id mavjudligini tekshirish (404)
        const course = await Course.findByPk(moduleData.course_id);
        if (!course) {
            return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
        }

        const courseModule = await CourseModule.create(moduleData);
        res.status(201).send(courseModule);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha modullarni olish (Read All)
exports.getCourseModule = async (req, res) => {
    try {
        const courseModules = await CourseModule.findAll({
            include: Course ? [{ model: Course, as: "course", attributes: ["id", "name", "slug"] }] : [],
            order: [['order_number', 'ASC'], ['created_at', 'DESC']]
        });
        res.status(200).send(courseModules);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha modulni olish (Read One)
exports.getCourseModuleById = async (req, res) => {
    try {
        const courseModule = await CourseModule.findByPk(req.params.id, {
            include: Course ? [{ model: Course, as: "course", attributes: ["id", "name", "slug"] }] : []
        });
        if (!courseModule) return res.status(404).send("CourseModule not found");
        res.status(200).send(courseModule);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Modul ma'lumotlarini yangilash (Update)
exports.updateCourseModule = async (req, res) => {
    const { error } = validateCourseModule(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const courseModule = await CourseModule.findByPk(req.params.id);
        if (!courseModule) return res.status(404).send("CourseModule not found");

        const updateData = { ...req.body };

        // course_id o'zgargan bo'lsa, tekshirish (404)
        if (updateData.course_id) {
            const course = await Course.findByPk(updateData.course_id);
            if (!course) {
                return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
            }
        }

        await courseModule.update(updateData);
        res.status(200).send(courseModule);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Modulni o'chirish (Delete)
exports.deleteCourseModule = async (req, res) => {
    try {
        const courseModule = await CourseModule.findByPk(req.params.id);
        if (!courseModule) return res.status(404).send("CourseModule not found");

        const data = courseModule.toJSON();
        await courseModule.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Modullarni qidirish (Search)
exports.searchCourseModule = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const courseModules = await CourseModule.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: Course ? [{ model: Course, as: "course", attributes: ["id", "name", "slug"] }] : [],
            order: [['order_number', 'ASC']]
        });
        res.status(200).send(courseModules);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
