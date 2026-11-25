const { Payment, Student, PaymentMethod, User, Invoice, Course, Group } = require("../../models");
const { validatePayment } = require("./paymentValidation");
const { Op } = require("sequelize");

// 1. Yangi to'lov yaratish (Create)
exports.createPayment = async (req, res) => {
    const { error } = validatePayment(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const paymentData = { ...req.body };

        // student_id mavjudligini tekshirish (404)
        const student = await Student.findByPk(paymentData.student_id);
        if (!student) {
            return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
        }

        // payment_method_id berilgan bo'lsa tekshirish (404)
        if (paymentData.payment_method_id) {
            const paymentMethod = await PaymentMethod.findByPk(paymentData.payment_method_id);
            if (!paymentMethod) {
                return res.status(404).send("Belgilangan payment_method_id ga ega to'lov usuli topilmadi");
            }
        } else {
            paymentData.payment_method_id = null;
        }

        // invoice_id berilgan bo'lsa va Invoice modeli mavjud bo'lsa tekshirish (404)
        if (paymentData.invoice_id) {
            if (Invoice) {
                const invoice = await Invoice.findByPk(paymentData.invoice_id);
                if (!invoice) {
                    return res.status(404).send("Belgilangan invoice_id ga ega hisob-faktura topilmadi");
                }
            }
        } else {
            paymentData.invoice_id = null;
        }

        // created_by berilgan bo'lsa tekshirish (404)
        if (paymentData.created_by) {
            const user = await User.findByPk(paymentData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        } else {
            paymentData.created_by = null;
        }

        const payment = await Payment.create(paymentData);
        res.status(201).send(payment);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha to'lovlarni olish (Read All)
exports.getPayment = async (req, res) => {
    try {
        const payments = await Payment.findAll({
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status", "course_id", "group_id"],
                    include: [
                        User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] } : null,
                        Course ? { model: Course, as: "course", attributes: ["id", "name", "price"] } : null,
                        Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
                    ].filter(Boolean)
                } : null,
                PaymentMethod ? { model: PaymentMethod, as: "payment_method", attributes: ["id", "name", "code"] } : null,
                Invoice ? { model: Invoice, as: "invoice", attributes: ["id", "amount", "status"] } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(payments);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta to'lovni olish (Read One)
exports.getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status", "course_id", "group_id"],
                    include: [
                        User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] } : null,
                        Course ? { model: Course, as: "course", attributes: ["id", "name", "price"] } : null,
                        Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
                    ].filter(Boolean)
                } : null,
                PaymentMethod ? { model: PaymentMethod, as: "payment_method", attributes: ["id", "name", "code"] } : null,
                Invoice ? { model: Invoice, as: "invoice", attributes: ["id", "amount", "status"] } : null,
                User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean)
        });
        if (!payment) return res.status(404).send("Payment not found");
        res.status(200).send(payment);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. To'lov ma'lumotlarini yangilash (Update)
exports.updatePayment = async (req, res) => {
    const { error } = validatePayment(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) return res.status(404).send("Payment not found");

        const updateData = { ...req.body };

        if (updateData.student_id) {
            const student = await Student.findByPk(updateData.student_id);
            if (!student) {
                return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
            }
        }

        if (updateData.payment_method_id) {
            const paymentMethod = await PaymentMethod.findByPk(updateData.payment_method_id);
            if (!paymentMethod) {
                return res.status(404).send("Belgilangan payment_method_id ga ega to'lov usuli topilmadi");
            }
        }

        if (updateData.created_by) {
            const user = await User.findByPk(updateData.created_by);
            if (!user) {
                return res.status(404).send("Belgilangan created_by ga ega foydalanuvchi topilmadi");
            }
        }

        await payment.update(updateData);
        res.status(200).send(payment);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. To'lovni o'chirish (Delete)
exports.deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) return res.status(404).send("Payment not found");

        const data = payment.toJSON();
        await payment.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. To'lovlarni qidirish (Search)
exports.searchPayment = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const payments = await Payment.findAll({
            where: {
                [Op.or]: [
                    { transaction_id: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } },
                    { note: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
                } : null,
                PaymentMethod ? { model: PaymentMethod, as: "payment_method", attributes: ["id", "name", "code"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(payments);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
