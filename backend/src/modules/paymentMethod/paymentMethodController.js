const { PaymentMethod } = require("../../models");
const { validatePaymentMethod } = require("./paymentMethodValidation");
const { Op } = require("sequelize");

// 1. Yangi to'lov usulini yaratish (Create)
exports.createPaymentMethod = async (req, res) => {
    const { error } = validatePaymentMethod(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const { code } = req.body;

        // code unikal ekanligini tekshirish
        const existingMethod = await PaymentMethod.findOne({ where: { code: code.toLowerCase().trim() } });
        if (existingMethod) {
            return res.status(400).send("Bunday kodga ega to'lov usuli allaqachon mavjud");
        }

        const paymentMethod = await PaymentMethod.create({
            ...req.body,
            code: code.toLowerCase().trim()
        });
        res.status(201).send(paymentMethod);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha to'lov usullarini olish (Read All)
exports.getPaymentMethod = async (req, res) => {
    try {
        const paymentMethods = await PaymentMethod.findAll({
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(paymentMethods);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta to'lov usulini olish (Read One)
exports.getPaymentMethodById = async (req, res) => {
    try {
        const paymentMethod = await PaymentMethod.findByPk(req.params.id);
        if (!paymentMethod) return res.status(404).send("PaymentMethod not found");
        res.status(200).send(paymentMethod);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. To'lov usuli ma'lumotlarini yangilash (Update)
exports.updatePaymentMethod = async (req, res) => {
    const { error } = validatePaymentMethod(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const paymentMethod = await PaymentMethod.findByPk(req.params.id);
        if (!paymentMethod) return res.status(404).send("PaymentMethod not found");

        const updateData = { ...req.body };

        if (updateData.code) {
            updateData.code = updateData.code.toLowerCase().trim();
            const existingMethod = await PaymentMethod.findOne({
                where: {
                    code: updateData.code,
                    id: { [Op.ne]: req.params.id }
                }
            });
            if (existingMethod) {
                return res.status(400).send("Bunday kodga ega to'lov usuli allaqachon mavjud");
            }
        }

        await paymentMethod.update(updateData);
        res.status(200).send(paymentMethod);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. To'lov usulini o'chirish (Delete)
exports.deletePaymentMethod = async (req, res) => {
    try {
        const paymentMethod = await PaymentMethod.findByPk(req.params.id);
        if (!paymentMethod) return res.status(404).send("PaymentMethod not found");

        const data = paymentMethod.toJSON();
        await paymentMethod.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. To'lov usullarini qidirish (Search)
exports.searchPaymentMethod = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const paymentMethods = await PaymentMethod.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${query}%` } },
                    { code: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(paymentMethods);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
