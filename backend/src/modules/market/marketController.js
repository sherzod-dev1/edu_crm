const db = require('../../models');
const { MarketOrder, Student, User, Notification } = db;
const { Op } = require('sequelize');
const { verifyToken } = require('../../utils/auth');

const CATALOG_ITEMS = [
    {
        key: 'notebook',
        name: "O'quv markazi brendli daftari",
        coins: 150,
        category: "Kanselyariya",
        description: "O'quv markazi logotipi va shiori tushirilgan, qattiq muqovali 96 varaqli maxsus premium daftar.",
        icon: 'BookOpen',
        badge: 'Ommabop',
        in_stock: true
    },
    {
        key: 'cup',
        name: "O'quv markazi brendli stakani / termo-krujka",
        coins: 200,
        category: "Aksessuarlar",
        description: "O'quv markazi brendi tushirilgan, ichimlik haroratini saqlovchi zanglamas metall termo-stakan.",
        icon: 'Coffee',
        badge: 'Tavsiya etiladi',
        in_stock: true
    },
    {
        key: 'pen_set',
        name: "Brendli ruchka va bloknot to'plami",
        coins: 80,
        category: "Kanselyariya",
        description: "O'quv markazi metall korpusli ruchkasi va qulay cho'ntak bloknoti.",
        icon: 'PenTool',
        badge: 'Arzon',
        in_stock: true
    },
    {
        key: 'tshirt',
        name: "O'quv markazi brendli futbolkasi",
        coins: 350,
        category: "Kiyim",
        description: "100% paxta, nafas oluvchi sifatli mato va markaz emblemasi bilan tikilgan zamonaviy futbolka.",
        icon: 'Shirt',
        badge: 'Premium',
        in_stock: true
    }
];

const marketController = {
    // 1. Get Market Catalog
    getCatalog(req, res) {
        return res.json({
            success: true,
            data: CATALOG_ITEMS
        });
    },

    // 2. Place an order (Talaba tomonidan zakaz berish)
    // Eslatma: Tangalar zakaz berilganda DARHOL yechilmaydi!
    // Tangalar faqat Admin yoki Manager buyurtmani qabul qilib olgandagina yechiladi!
    async placeOrder(req, res) {
        const t = await db.sequelize.transaction();
        try {
            const { student_id, item_key, note } = req.body;

            if (!student_id || !item_key) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Talaba va mahsulot tanlanishi shart." });
            }

            const item = CATALOG_ITEMS.find((i) => i.key === item_key);
            if (!item) {
                await t.rollback();
                return res.status(404).json({ success: false, message: "Tanlangan mahsulot do'konda topilmadi." });
            }

            const student = await Student.findByPk(student_id, {
                include: [
                    { model: User, as: 'user' },
                    { model: db.Group, as: 'group' },
                    {
                        model: db.GroupStudent,
                        as: 'group_students',
                        include: [{ model: db.Group, as: 'group' }]
                    }
                ],
                transaction: t
            });

            if (!student) {
                await t.rollback();
                return res.status(404).json({ success: false, message: "Talaba ma'lumotlari topilmadi." });
            }

            const currentCoins = student.coins || 0;
            if (currentCoins < item.coins) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Tangalar yetarli emas! Sizda ${currentCoins} ta monet mavjud, ammo "${item.name}" uchun ${item.coins} monet kerak (yana ${item.coins - currentCoins} monet yetishmayapti).`
                });
            }

            // Hali qabul qilinmagan (pending) zakazlarga band qilingan tangalarni tekshirish
            const pendingOrders = await MarketOrder.findAll({
                where: {
                    student_id: student.id,
                    status: 'pending'
                },
                transaction: t
            });
            const reservedCoins = pendingOrders.reduce((sum, ord) => sum + (ord.coins_spent || 0), 0);
            const availableCoins = currentCoins - reservedCoins;

            if (availableCoins < item.coins) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Mavjud tangalaringiz yetarli emas! Sizda jami ${currentCoins} monet bor, shundan ${reservedCoins} monet oldingi kutilayotgan zakazlaringizga band qilingan. Hozirda erkin mavjud tangangiz: ${Math.max(0, availableCoins)} monet (talab qilinadi: ${item.coins} monet).`
                });
            }

            // DIQQAT: Tangalar hozir yechilmaydi! student.coins o'zgarishsiz qoladi.
            // Tangalar faqat Admin/Manager "Qabul qilish" (status: 'delivered') qilganda yechiladi.

            // Yangi buyurtma yaratish
            const newOrder = await MarketOrder.create({
                student_id: student.id,
                item_key: item.key,
                item_name: item.name,
                coins_spent: item.coins,
                coins_deducted: false,
                status: 'pending',
                ordered_at: new Date(),
                admin_note: note || null
            }, { transaction: t });

            // Talabaning guruh nomini aniqlash (masalan: "IT kids")
            let groupName = student.group?.name;
            if (!groupName && student.group_students && student.group_students.length > 0) {
                groupName = student.group_students[0].group?.name;
            }
            if (!groupName) {
                groupName = "IT kids";
            }

            const studentFullName = student.user?.full_name || `Talaba #${student.id}`;

            // 1. Talabaga bildirishnoma
            if (student.user_id && Notification) {
                await Notification.create({
                    user_id: student.user_id,
                    title: `🛍️ Buyurtmangiz qabul qilindi (Kutilmoqda)`,
                    message: `Siz ${item.coins} monetlik "${item.name}" buyurtma qildingiz. Admin yoki Manager zakazni tasdiqlab topshirgach, ${item.coins} monet balansingizdan yechiladi.`,
                    type: 'info',
                    is_read: false
                }, { transaction: t }).catch(() => {});
            }

            // 2. Admin va Managerlarga bildirishnoma yuborish
            try {
                const adminsAndManagers = await User.findAll({
                    where: {
                        [Op.or]: [
                            { role: { [Op.iLike]: '%admin%' } },
                            { role: { [Op.iLike]: '%manager%' } },
                            { role: { [Op.iLike]: '%moderator%' } }
                        ]
                    },
                    limit: 25,
                    transaction: t
                });

                for (const adm of adminsAndManagers) {
                    await Notification.create({
                        user_id: adm.id,
                        title: `🛍️ Yangi sovg'a buyurtmasi: ${item.name}`,
                        message: `"${groupName}" guruhidagi ${studentFullName} ${item.coins} monet evaziga brendlangan "${item.name}" buyurtma qildi! Buyurtmani ko'rib chiqib qabul qilishingiz mumkin (tangalar qabul qilinganda yechiladi).`,
                        type: 'info',
                        is_read: false
                    }, { transaction: t }).catch(() => {});
                }
            } catch (e) {
                console.warn('Admin/Manager notification error:', e.message);
            }

            await t.commit();

            return res.json({
                success: true,
                message: `Tabriklaymiz! "${item.name}" buyurtmangiz muvaffaqiyatli jo'natildi. Admin yoki Manager zakazni qabul qilib topshirgach, hisobingizdan ${item.coins} monet yechiladi.`,
                data: {
                    order: newOrder,
                    current_coins: currentCoins,
                    group_name: groupName,
                    student_name: studentFullName
                }
            });
        } catch (error) {
            await t.rollback();
            console.error('placeOrder error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 3. Get Orders for a specific student
    async getStudentOrders(req, res) {
        try {
            const { student_id } = req.params;
            const targetStudentId = student_id || req.query.student_id;

            if (!targetStudentId) {
                return res.status(400).json({ success: false, message: "Talaba ID ko'rsatilishi shart." });
            }

            const orders = await MarketOrder.findAll({
                where: { student_id: targetStudentId },
                order: [['ordered_at', 'DESC']]
            });

            return res.json({
                success: true,
                data: orders
            });
        } catch (error) {
            console.error('getStudentOrders error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 4. Get All Orders for Admin & Manager
    // Har bir zakazda guruh nomi (masalan: "IT kids"), talaba F.I.SH va tangalari to'liq ko'rinadi
    async getAllOrdersForAdmin(req, res) {
        try {
            const { status, limit = 100, page = 1 } = req.query;

            const where = {};
            if (status && status !== 'all') {
                where.status = status;
            }

            const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

            const { rows: orders, count } = await MarketOrder.findAndCountAll({
                where,
                include: [
                    {
                        model: Student,
                        as: 'student',
                        include: [
                            { model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] },
                            { model: db.Group, as: 'group', attributes: ['id', 'name'] },
                            {
                                model: db.GroupStudent,
                                as: 'group_students',
                                include: [{ model: db.Group, as: 'group', attributes: ['id', 'name'] }]
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'processor',
                        attributes: ['id', 'full_name']
                    }
                ],
                order: [['ordered_at', 'DESC']],
                limit: parseInt(limit, 10),
                offset
            });

            // Har bir buyurtma uchun talabaning aniq guruhini formatlab qo'yish
            const formattedOrders = orders.map((ord) => {
                const raw = ord.toJSON();
                const st = raw.student;
                if (st) {
                    let groupName = st.group?.name;
                    if (!groupName && st.group_students && st.group_students.length > 0) {
                        groupName = st.group_students[0].group?.name;
                    }
                    st.group_name = groupName || "IT kids";
                }
                return raw;
            });

            return res.json({
                success: true,
                data: formattedOrders,
                total: count,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10)
            });
        } catch (error) {
            console.error('getAllOrdersForAdmin error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 5. Update Order Status (Admin va Manager tomonidan qabul qilish yoki bekor qilish)
    // AGAR ADMIN/MANAGER QABUL QILIB OLSA (status === 'delivered') => TANGALAR YECHILADI!
    async updateOrderStatus(req, res) {
        const t = await db.sequelize.transaction();
        try {
            const { id } = req.params;
            const { status, admin_note } = req.body;

            if (!['delivered', 'cancelled', 'pending'].includes(status)) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Yaroqsiz holat ko'rsatildi." });
            }

            // Processor (Admin yoki Manager) ni aniqlash
            let processorId = req.user?.id;
            if (!processorId) {
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    try {
                        const decoded = verifyToken(authHeader.split(' ')[1]);
                        processorId = decoded?.id;
                    } catch (e) {}
                }
            }
            if (!processorId && req.body.processed_by) {
                processorId = req.body.processed_by;
            }

            const order = await MarketOrder.findByPk(id, {
                include: [{
                    model: Student,
                    as: 'student',
                    include: [{ model: User, as: 'user' }]
                }],
                transaction: t
            });

            if (!order) {
                await t.rollback();
                return res.status(404).json({ success: false, message: "Buyurtma topilmadi." });
            }

            const prevStatus = order.status;

            // 1. QABUL QILISH (TOPShIRILDI) - TANGALARNI YECHISH
            if (status === 'delivered') {
                if (!order.student) {
                    await t.rollback();
                    return res.status(404).json({ success: false, message: "Buyurtmaga tegishli talaba topilmadi." });
                }

                // Agar tangalar hali yechilmagan bo'lsa
                if (!order.coins_deducted) {
                    const studentCoins = order.student.coins || 0;
                    if (studentCoins < order.coins_spent) {
                        await t.rollback();
                        return res.status(400).json({
                            success: false,
                            message: `Talabaning tangalari yetarli emas! Talabada ${studentCoins} monet mavjud, lekin buyurtma qilingan mahsulot uchun ${order.coins_spent} monet talab qilinadi.`
                        });
                    }

                    // Tangalarni talabadan yechish
                    order.student.coins = studentCoins - order.coins_spent;
                    await order.student.save({ transaction: t });
                    order.coins_deducted = true;
                }

                order.status = 'delivered';
                order.processed_at = new Date();
                order.processed_by = processorId || null;
                if (admin_note !== undefined) {
                    order.admin_note = admin_note;
                }
                await order.save({ transaction: t });

                // Talabaga muvaffaqiyat bildirishnomasi
                if (order.student.user_id && Notification) {
                    await Notification.create({
                        user_id: order.student.user_id,
                        title: `🎁 Sovg'angiz qabul qilindi va topshirildi!`,
                        message: `Tabriklaymiz! Admin/Manager sizning "${order.item_name}" buyurtmangizni qabul qildi va hisobingizdan ${order.coins_spent} monet yechildi. Qolgan tangalaringiz: ${order.student.coins} monet. Sovg'angiz muborak bo'lsin! 🚀`,
                        type: 'success',
                        is_read: false
                    }, { transaction: t }).catch(() => {});
                }
            }
            // 2. BEKOR QILISh (CANCELLED)
            else if (status === 'cancelled') {
                // Agar ilgari qabul qilinib tanga yechilgan bo'lsa, uni qaytarish
                if (order.coins_deducted && order.student) {
                    const refundAmount = order.coins_spent || 0;
                    order.student.coins = (order.student.coins || 0) + refundAmount;
                    await order.student.save({ transaction: t });
                    order.coins_deducted = false;
                }

                order.status = 'cancelled';
                order.processed_at = new Date();
                order.processed_by = processorId || null;
                if (admin_note !== undefined) {
                    order.admin_note = admin_note;
                }
                await order.save({ transaction: t });

                // Talabaga bekor qilingani haqida xabar
                if (order.student?.user_id && Notification) {
                    await Notification.create({
                        user_id: order.student.user_id,
                        title: `❌ Buyurtma bekor qilindi`,
                        message: `Sizning "${order.item_name}" sovg'a buyurtmangiz Admin/Manager tomonidan bekor qilindi. Tangalaringiz yechilmadi (qolgan balans: ${order.student.coins || 0} monet).`,
                        type: 'warning',
                        is_read: false
                    }, { transaction: t }).catch(() => {});
                }
            }
            // 3. KUTILMOQDA (PENDING) HOLATIGA QAYTARISh
            else if (status === 'pending') {
                if (order.coins_deducted && order.student) {
                    order.student.coins = (order.student.coins || 0) + (order.coins_spent || 0);
                    await order.student.save({ transaction: t });
                    order.coins_deducted = false;
                }
                order.status = 'pending';
                order.processed_at = null;
                order.processed_by = null;
                if (admin_note !== undefined) {
                    order.admin_note = admin_note;
                }
                await order.save({ transaction: t });
            }

            await t.commit();

            return res.json({
                success: true,
                message: status === 'delivered'
                    ? `Buyurtma muvaffaqiyatli qabul qilindi va talabadan ${order.coins_spent} monet yechildi (Qolgan balans: ${order.student?.coins} monet).`
                    : "Buyurtma bekor qilindi.",
                data: order
            });
        } catch (error) {
            await t.rollback();
            console.error('updateOrderStatus error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = marketController;
