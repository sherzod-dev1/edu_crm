const { Invoice, Student, Group, User, Payment, Course } = require("../../models");
const { validateInvoice } = require("./invoiceValidation");
const { Op } = require("sequelize");

// Avtomatik invoice_number yaratish
const generateInvoiceNumber = () => {
    return 'INV-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000);
};

// 1. Yangi hisob-faktura yaratish (Create)
exports.createInvoice = async (req, res) => {
    const { error } = validateInvoice(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const invoiceData = { ...req.body };

        // student_id mavjudligini tekshirish (404)
        const student = await Student.findByPk(invoiceData.student_id);
        if (!student) {
            return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
        }

        // group_id berilgan bo'lsa tekshirish (404)
        if (invoiceData.group_id) {
            const group = await Group.findByPk(invoiceData.group_id);
            if (!group) {
                return res.status(404).send("Belgilangan group_id ga ega guruh topilmadi");
            }
        } else {
            invoiceData.group_id = null;
        }

        // created_by berilgan bo'lsa tekshirish (404)
        if (invoiceData.created_by) {
            const user = await User.findByPk(invoiceData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        } else {
            invoiceData.created_by = null;
        }

        if (!invoiceData.invoice_number) {
            invoiceData.invoice_number = generateInvoiceNumber();
        }

        const paid = Number(invoiceData.paid_amount || 0);
        const total = Number(invoiceData.amount);
        if (invoiceData.due_amount === undefined || invoiceData.due_amount === null) {
            invoiceData.due_amount = Math.max(0, total - paid);
        }

        const invoice = await Invoice.create(invoiceData);
        res.status(201).send(invoice);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha hisob-fakturalarni olish (Read All)
exports.getInvoice = async (req, res) => {
    try {
        const invoices = await Invoice.findAll({
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                Group ? { 
                    model: Group, 
                    as: "group", 
                    attributes: ["id", "name", "days"],
                    include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
                } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(invoices);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta hisob-fakturani olish (Read One)
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id, {
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                Group ? { 
                    model: Group, 
                    as: "group", 
                    attributes: ["id", "name", "days"],
                    include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
                } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null,
                Payment ? { model: Payment, as: "payments", attributes: ["id", "amount", "status", "payment_date"] } : null
            ].filter(Boolean)
        });
        if (!invoice) return res.status(404).send("Invoice not found");
        res.status(200).send(invoice);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Hisob-faktura ma'lumotlarini yangilash (Update)
exports.updateInvoice = async (req, res) => {
    const { error } = validateInvoice(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).send("Invoice not found");

        const updateData = { ...req.body };

        if (updateData.student_id) {
            const student = await Student.findByPk(updateData.student_id);
            if (!student) {
                return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
            }
        }

        if (updateData.group_id) {
            const group = await Group.findByPk(updateData.group_id);
            if (!group) {
                return res.status(404).send("Belgilangan group_id ga ega guruh topilmadi");
            }
        }

        if (updateData.created_by) {
            const user = await User.findByPk(updateData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        }

        await invoice.update(updateData);
        res.status(200).send(invoice);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Hisob-fakturani o'chirish (Delete)
exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).send("Invoice not found");

        const data = invoice.toJSON();
        await invoice.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Hisob-fakturalarni qidirish (Search)
exports.searchInvoice = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const invoices = await Invoice.findAll({
            where: {
                [Op.or]: [
                    { invoice_number: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
                } : null,
                Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(invoices);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
