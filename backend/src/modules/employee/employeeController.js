const { Employee, User, Branch } = require("../../models");
const { validateEmployee } = require("./employeeValidation");
const { Op } = require("sequelize");

// 1. Yangi xodim qo'shish (Create)
exports.createEmployee = async (req, res) => {
    const { error } = validateEmployee(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const employeeData = { ...req.body };

        // user_id mavjudligini tekshirish (404)
        const user = await User.findByPk(employeeData.user_id);
        if (!user) {
            return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
        }

        // branch_id berilgan bo'lsa, mavjudligini tekshirish (404)
        if (employeeData.branch_id) {
            const branch = await Branch.findByPk(employeeData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        } else {
            employeeData.branch_id = null;
        }

        const employee = await Employee.create(employeeData);
        const refreshedEmployee = await Employee.findByPk(employee.id, {
            include: [
                User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null
            ].filter(Boolean)
        });
        res.status(201).send(refreshedEmployee || employee);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha xodimlarni olish (Read All)
exports.getEmployee = async (req, res) => {
    try {
        const employees = await Employee.findAll({
            include: [
                User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(employees);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha xodimni olish (Read One)
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [
                User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null
            ].filter(Boolean)
        });
        if (!employee) return res.status(404).send("Employee not found");
        res.status(200).send(employee);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Xodim ma'lumotlarini yangilash (Update)
exports.updateEmployee = async (req, res) => {
    const { error } = validateEmployee(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) return res.status(404).send("Employee not found");

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

        await employee.update(updateData);

        // Agar user ma'lumotlari (full_name, phone, email) uzatilgan bo'lsa, foydalanuvchini ham yangilash
        const targetUserId = employee.user_id || updateData.user_id;
        if (targetUserId) {
            const user = await User.findByPk(targetUserId);
            if (user) {
                const userUpdate = {};
                if (req.body.full_name) userUpdate.full_name = req.body.full_name.trim();
                if (req.body.phone) userUpdate.phone = req.body.phone.trim();
                if (req.body.email !== undefined) {
                    const newEmail = req.body.email ? req.body.email.trim() : null;
                    if (newEmail && newEmail.toLowerCase() !== (user.email || '').toLowerCase()) {
                        const emailTaken = await User.findOne({
                            where: {
                                email: { [Op.iLike]: newEmail },
                                id: { [Op.ne]: user.id }
                            }
                        });
                        if (emailTaken) {
                            return res.status(400).send("Ushbu email boshqa foydalanuvchida mavjud!");
                        }
                    }
                    userUpdate.email = newEmail;
                }
                if (req.body.branch_id) userUpdate.branch_id = Number(req.body.branch_id);
                if (req.body.status) userUpdate.status = req.body.status;
                if (Object.keys(userUpdate).length > 0) {
                    await user.update(userUpdate);
                }
            }
        }

        const refreshedEmployee = await Employee.findByPk(employee.id, {
            include: [
                User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null
            ].filter(Boolean)
        });
        res.status(200).send(refreshedEmployee || employee);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Xodimni o'chirish (Delete)
exports.deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) return res.status(404).send("Employee not found");

        const data = employee.toJSON();
        const userId = employee.user_id;

        // Xodim profilini o'chirish
        await employee.destroy();

        // Xodimning asosiy User hisobini ham o'chirish (tizimga kira olmasligi uchun)
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

// 6. Xodimlarni qidirish (Search)
exports.searchEmployee = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const employees = await Employee.findAll({
            where: {
                [Op.or]: [
                    { position: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null
            ].filter(Boolean)
        });
        res.status(200).send(employees);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
