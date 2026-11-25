const { Lead, Branch, User, Course } = require("../../models");
const { validateLead } = require("./leadValidation");
const { Op } = require("sequelize");

// 1. Yangi lid (Lead) yaratish
exports.createLead = async (req, res) => {
    const { error } = validateLead(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const leadData = { ...req.body };

        // branch_id mavjudligini tekshirish (404)
        if (leadData.branch_id) {
            const branch = await Branch.findByPk(leadData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        } else {
            leadData.branch_id = null;
        }

        // assigned_to mavjudligini tekshirish (404)
        if (leadData.assigned_to) {
            const user = await User.findByPk(leadData.assigned_to);
            if (!user) {
                return res.status(404).send("Belgilangan assigned_to ga ega foydalanuvchi topilmadi");
            }
        } else {
            leadData.assigned_to = null;
        }

        // interested_course_id mavjudligini tekshirish (404)
        if (leadData.interested_course_id) {
            const course = await Course.findByPk(leadData.interested_course_id);
            if (!course) {
                return res.status(404).send("Belgilangan interested_course_id ga ega kurs topilmadi");
            }
        } else {
            leadData.interested_course_id = null;
        }

        const lead = await Lead.create(leadData);
        res.status(201).send(lead);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha lidlarni olish (Read All)
exports.getLead = async (req, res) => {
    try {
        const leads = await Lead.findAll({
            include: [
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null,
                User ? { model: User, as: "assigned_user", attributes: ["id", "full_name", "phone", "email", "role"] } : null,
                Course ? { model: Course, as: "interested_course", attributes: ["id", "name", "slug", "price", "duration_months"] } : null,
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(leads);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta lidni olish (Read One)
exports.getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findByPk(req.params.id, {
            include: [
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null,
                User ? { model: User, as: "assigned_user", attributes: ["id", "full_name", "phone", "email", "role"] } : null,
                Course ? { model: Course, as: "interested_course", attributes: ["id", "name", "slug", "price", "duration_months"] } : null,
            ].filter(Boolean)
        });
        if (!lead) return res.status(404).send("Lead not found");
        res.status(200).send(lead);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Lid ma'lumotlarini yangilash (Update)
exports.updateLead = async (req, res) => {
    const { error } = validateLead(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const lead = await Lead.findByPk(req.params.id);
        if (!lead) return res.status(404).send("Lead not found");

        const updateData = { ...req.body };

        if (updateData.branch_id) {
            const branch = await Branch.findByPk(updateData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        }

        if (updateData.assigned_to) {
            const user = await User.findByPk(updateData.assigned_to);
            if (!user) {
                return res.status(404).send("Belgilangan assigned_to ga ega foydalanuvchi topilmadi");
            }
        }

        if (updateData.interested_course_id) {
            const course = await Course.findByPk(updateData.interested_course_id);
            if (!course) {
                return res.status(404).send("Belgilangan interested_course_id ga ega kurs topilmadi");
            }
        }

        await lead.update(updateData);
        res.status(200).send(lead);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Lidni konvertatsiya qilish (Mark as converted)
exports.convertLead = async (req, res) => {
    try {
        const lead = await Lead.findByPk(req.params.id);
        if (!lead) return res.status(404).send("Lead not found");

        await lead.update({
            status: 'converted',
            converted_at: new Date()
        });

        res.status(200).send(lead);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Lidni o'chirish (Delete)
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findByPk(req.params.id);
        if (!lead) return res.status(404).send("Lead not found");

        const data = lead.toJSON();
        await lead.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 7. Qidirish (Search)
exports.searchLead = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const leads = await Lead.findAll({
            where: {
                [Op.or]: [
                    { full_name: { [Op.iLike]: `%${query}%` } },
                    { phone: { [Op.iLike]: `%${query}%` } },
                    { email: { [Op.iLike]: `%${query}%` } },
                    { source: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null,
                User ? { model: User, as: "assigned_user", attributes: ["id", "full_name"] } : null,
                Course ? { model: Course, as: "interested_course", attributes: ["id", "name"] } : null,
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(leads);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
