const { Branch, User } = require("../../models");
const { validateBranch } = require("./branchValidation");
const { Op } = require("sequelize");

// 1. Yangi filial yaratish (Create)
exports.createBranch = async (req, res) => {
    const { error } = validateBranch(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const branchData = { ...req.body };

        // Agar manager_id berilgan bo'lsa, bazada bunday user borligini tekshirish
        if (branchData.manager_id) {
            const manager = await User.findByPk(branchData.manager_id);
            if (!manager) {
                return res.status(404).send("Belgilangan manager_id ga ega foydalanuvchi topilmadi");
            }
        } else {
            branchData.manager_id = null;
        }

        const branch = await Branch.create(branchData);
        res.status(201).send(branch);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha filiallarni olish (Read All)
exports.getBranch = async (req, res) => {
    try {
        const branches = await Branch.findAll({
            include: User ? [{ model: User, as: "manager", attributes: ["id", "full_name", "phone", "email"] }] : []
        });
        res.status(200).send(branches);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha filialni olish (Read One)
exports.getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findByPk(req.params.id, {
            include: User ? [{ model: User, as: "manager", attributes: ["id", "full_name", "phone", "email"] }] : []
        });
        if (!branch) return res.status(404).send("Branch not found");
        res.status(200).send(branch);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Filial ma'lumotlarini yangilash (Update)
exports.updateBranch = async (req, res) => {
    const { error } = validateBranch(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).send("Branch not found");

        const updateData = { ...req.body };
        if (updateData.manager_id) {
            const manager = await User.findByPk(updateData.manager_id);
            if (!manager) {
                return res.status(404).send("Belgilangan manager_id ga ega foydalanuvchi topilmadi");
            }
        }


        await branch.update(updateData);

        if (updateData.plan && User) {
            await User.update(
                { plan: updateData.plan },
                { where: { branch_id: branch.id, role: ['ADMIN', 'MANAGER'] } }
            ).catch(() => {});
        }

        res.status(200).send(branch);
    } catch (err) {
        res.status(500).send(err.message);
    }
};


// 5. Filialni o'chirish (Delete)
exports.deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).send("Branch not found");

        const data = branch.toJSON();
        await branch.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Filiallarni qidirish (Search)
exports.searchBranch = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const branches = await Branch.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${query}%` } },
                    { address: { [Op.iLike]: `%${query}%` } },
                    { phone: { [Op.iLike]: `%${query}%` } },
                    { email: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: User ? [{ model: User, as: "manager", attributes: ["id", "full_name", "phone", "email"] }] : []
        });
        res.status(200).send(branches);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
