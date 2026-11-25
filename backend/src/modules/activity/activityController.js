const { Activity, User } = require("../../models");
const { validateActivity } = require("./activityValidation");
const { Op } = require("sequelize");

// 1. Yangi faollik yozuvi yaratish (Create Activity Log)
exports.createActivity = async (req, res) => {
    const { error } = validateActivity(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const activityData = { ...req.body };

        // Agar ip_address berilmagan bo'lsa so'rovdan olish
        if (!activityData.ip_address) {
            activityData.ip_address = req.ip || req.connection?.remoteAddress || null;
        }

        // user_id berilgan bo'lsa tekshirish (404)
        if (activityData.user_id) {
            const user = await User.findByPk(activityData.user_id);
            if (!user) {
                return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
            }
        } else {
            activityData.user_id = null;
        }

        const activity = await Activity.create(activityData);
        res.status(201).send(activity);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha faolliklar ro'yxatini olish (Read All)
exports.getActivity = async (req, res) => {
    try {
        const activities = await Activity.findAll({
            include: [
                User ? { 
                    model: User, 
                    as: "user", 
                    attributes: ["id", "full_name", "phone", "email", "role"] 
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(activities);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta faollikni olish (Read One)
exports.getActivityById = async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id, {
            include: [
                User ? { 
                    model: User, 
                    as: "user", 
                    attributes: ["id", "full_name", "phone", "email", "role"] 
                } : null
            ].filter(Boolean)
        });
        if (!activity) return res.status(404).send("Activity not found");
        res.status(200).send(activity);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Foydalanuvchiga tegishli faolliklarni olish
exports.getUserActivities = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
        }

        const activities = await Activity.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(activities);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Obyekt turi va ID si bo'yicha faolliklar tarixini olish (e.g. Lead 1, Student 2)
exports.getEntityActivities = async (req, res) => {
    try {
        const { type, id } = req.params;
        const activities = await Activity.findAll({
            where: {
                entity_type: { [Op.iLike]: type },
                entity_id: id
            },
            include: [
                User ? { 
                    model: User, 
                    as: "user", 
                    attributes: ["id", "full_name", "role"] 
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(activities);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Faollikni tahrirlash (Update)
exports.updateActivity = async (req, res) => {
    const { error } = validateActivity(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) return res.status(404).send("Activity not found");

        const updateData = { ...req.body };

        if (updateData.user_id) {
            const user = await User.findByPk(updateData.user_id);
            if (!user) {
                return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
            }
        }

        await activity.update(updateData);
        res.status(200).send(activity);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 7. Faollikni o'chirish (Delete)
exports.deleteActivity = async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) return res.status(404).send("Activity not found");

        const data = activity.toJSON();
        await activity.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 8. Qidirish (Search)
exports.searchActivity = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const activities = await Activity.findAll({
            where: {
                [Op.or]: [
                    { action: { [Op.iLike]: `%${query}%` } },
                    { entity_type: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                    { ip_address: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                User ? { 
                    model: User, 
                    as: "user", 
                    attributes: ["id", "full_name", "role"] 
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(activities);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
