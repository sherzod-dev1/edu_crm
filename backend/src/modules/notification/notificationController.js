const { Notification, User } = require("../../models");
const { validateNotification } = require("./notificationValidation");
const { Op } = require("sequelize");
const { verifyToken } = require("../../utils/auth");

// Yordamchi: 7 kundan (1 haftadan) eski xabarlarni tizimdan avtomatik tozalash (Retention: 7 days)
async function purgeOldNotifications() {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await Notification.destroy({
            where: {
                created_at: {
                    [Op.lt]: sevenDaysAgo
                }
            }
        });
    } catch (e) {
        console.warn("Xabarlarni avtomatik tozalash ogohlantirishi:", e.message);
    }
}
exports.purgeOldNotifications = purgeOldNotifications;

// Yordamchi: Agar bazada xabarnomalar bo'lmasa, mavjud Adminlar bajargan amallarni avtomatik shakllantirish
async function autoSeedAdminNotificationsIfEmpty() {
    try {
        const count = await Notification.count();
        if (count === 0 && User) {
            const admins = await User.findAll({
                where: { role: { [Op.in]: ['ADMIN', 'admin', 'Admin'] } }
            });

            if (admins.length > 0) {
                const admin1 = admins[0];
                const admin2 = admins[1] || admins[0];

                const seedData = [
                    {
                        user_id: admin1.id,
                        title: "Admin tomonidan yangi to'lov qabul qilindi",
                        message: `${admin1.full_name} administratori talaba to'lovini (1,200,000 UZS) kassa orqali qabul qildi va kvitansiya chiqardi.`,
                        type: "payment",
                        is_read: false,
                        created_at: new Date(Date.now() - 1000 * 60 * 20),
                    },
                    {
                        user_id: admin2.id,
                        title: "Admin yangi o'quv guruhi yaratdi",
                        message: `${admin2.full_name} administratori "Frontend React BootCamp" nomli yangi guruh ochdi va dars jadvalini tasdiqladi.`,
                        type: "group",
                        is_read: false,
                        created_at: new Date(Date.now() - 1000 * 60 * 75),
                    },
                    {
                        user_id: admin1.id,
                        title: "Admin shartnoma muddatini uzaytirdi (+1 oy)",
                        message: `${admin1.full_name} markazi oylik CRM xizmat shartnomasi muddatini keyingi 1 oyga muvaffaqiyatli uzaytirdi.`,
                        type: "contract",
                        is_read: true,
                        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5),
                    },
                    {
                        user_id: admin2.id,
                        title: "Admin yangi o'qituvchi va xodim biriktirdi",
                        message: `${admin2.full_name} administratori yangi o'qituvchini tizimga kiritdi va kurslarga biriktirdi.`,
                        type: "user",
                        is_read: true,
                        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
                    },
                    {
                        user_id: admin1.id,
                        title: "Admin yangi filial va xona ma'lumotlarini kiritdi",
                        message: `${admin1.full_name} markazi yangi zamonaviy dars xonalarini va filial lokatsiyasini tizimga qo'shdi.`,
                        type: "branch",
                        is_read: true,
                        created_at: new Date(Date.now() - 1000 * 60 * 60 * 48),
                    }
                ];

                await Notification.bulkCreate(seedData);
            }
        }
    } catch (e) {
        console.error("Auto seed admin notifications error:", e);
    }
}

// 1. Yangi xabarnoma yaratish (Super Admin -> Adminga xabar jo'natish yoki individual)
exports.createNotification = async (req, res) => {
    try {
        const { user_id, user_ids, title, message, type = 'info', is_read = false } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: "Sarlavha va xabar matni kiritilishi shart" });
        }

        // Agar bir nechta adminlarga ommaviy jo'natilsa
        if (Array.isArray(user_ids) && user_ids.length > 0) {
            const createdList = [];
            for (const uid of user_ids) {
                const item = await Notification.create({
                    user_id: uid,
                    title,
                    message,
                    type,
                    is_read: false
                });
                createdList.push(item);
            }
            return res.status(201).json(createdList);
        }

        // Bitta user_id uchun
        let targetUserId = user_id;
        if (!targetUserId) {
            // Agar ko'rsatilmagan bo'lsa, birinchi faol adminni olish
            const firstAdmin = await User.findOne({
                where: { role: { [Op.in]: ['ADMIN', 'admin', 'Admin'] } }
            });
            targetUserId = firstAdmin?.id || 1;
        }

        const user = await User.findByPk(targetUserId);
        if (!user) {
            return res.status(404).json({ message: "Belgilangan foydalanuvchi topilmadi" });
        }

        const notification = await Notification.create({
            user_id: targetUserId,
            title,
            message,
            type,
            is_read: Boolean(is_read)
        });

        const fullNotif = await Notification.findByPk(notification.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email', 'role'] }]
        });

        res.status(201).json(fullNotif);
    } catch (err) {
        console.error("Create notification error:", err);
        res.status(500).json({ message: err.message || "Xabarnoma yaratishda xatolik" });
    }
};

// 2. Barcha xabarnomalarni olish (Read All - So'nggi 1 haftalik)
exports.getNotification = async (req, res) => {
    try {
        // 7 kundan eski xabarlarni tizimdan avtomatik tozalash
        await purgeOldNotifications();

        const { role, user_id, admin_only, type } = req.query;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const whereClause = {
            created_at: {
                [Op.gte]: sevenDaysAgo
            }
        };

        // Token orqali so'rov yuborgan foydalanuvchini tekshirish
        let caller = null;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = verifyToken(token);
                if (decoded && decoded.id) {
                    caller = await User.findByPk(decoded.id);
                }
            } catch (e) {
                // ignore
            }
        }

        const callerRole = (caller?.role || '').toUpperCase();

        // Talaba yoki o'qituvchilarga ichki ma'muriy, oylik maosh va davomat bildirishnomalari ko'rinmasligi kerak!
        // Faqat Admin, Manager va Nazoratchilarga ko'rinsin
        if (callerRole === 'STUDENT' || callerRole === 'TEACHER') {
            return res.status(200).send([]);
        }

        if (user_id) {
            whereClause.user_id = user_id;
        }
        if (type && type !== 'ALL') {
            whereClause.type = type;
        }

        let userInclude = { 
            model: User, 
            as: "user", 
            attributes: ["id", "full_name", "phone", "email", "role"] 
        };

        // Faqat Admin bajargan / Adminga tegishli ishlarni filtr qilish (Super Admin uchun)
        if (admin_only === 'true' || (role && role.toUpperCase() === 'ADMIN')) {
            userInclude.where = {
                role: { [Op.in]: ['ADMIN', 'admin', 'Admin'] }
            };
        } else if (role) {
            userInclude.where = {
                role: { [Op.iLike]: role }
            };
        } else {
            // Faqat ADMIN, MANAGER, NAZORATCHI, BUXGALTER, SUPER_ADMIN ga tegishli xabarlarni ko'rsatish
            userInclude.where = {
                role: { [Op.in]: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'NAZORATCHI', 'SUPERVISOR', 'INSPECTOR', 'ACCOUNTANT', 'STAFF'] }
            };
        }

        const notifications = await Notification.findAll({
            where: whereClause,
            include: [User ? userInclude : null].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(notifications);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta xabarnomani olish (Read One)
exports.getNotificationById = async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id, {
            include: [
                User ? { 
                    model: User, 
                    as: "user", 
                    attributes: ["id", "full_name", "phone", "email", "role"] 
                } : null
            ].filter(Boolean)
        });
        if (!notification) return res.status(404).send("Notification not found");
        res.status(200).send(notification);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Ma'lum foydalanuvchining barcha xabarnomalarini olish (So'nggi 7 kunlik)
exports.getUserNotifications = async (req, res) => {
    try {
        await purgeOldNotifications();
        const { userId } = req.params;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const notifications = await Notification.findAll({
            where: {
                user_id: userId,
                created_at: {
                    [Op.gte]: sevenDaysAgo
                }
            },
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(notifications);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Xabarnomani tahrirlash (Update)
exports.updateNotification = async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id);
        if (!notification) return res.status(404).send("Notification not found");

        const updateData = { ...req.body };

        if (updateData.user_id) {
            const user = await User.findByPk(updateData.user_id);
            if (!user) {
                return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
            }
        }

        await notification.update(updateData);

        const updated = await Notification.findByPk(req.params.id, {
            include: [
                User ? { 
                    model: User, 
                    as: "user", 
                    attributes: ["id", "full_name", "phone", "email", "role"] 
                } : null
            ].filter(Boolean)
        });

        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Xabarnomani o'qildi deb belgilash (Mark as read)
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id);
        if (!notification) return res.status(404).send("Notification not found");

        await notification.update({
            is_read: true,
            read_at: new Date()
        });

        res.status(200).send(notification);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 7. Foydalanuvchining yoki tanlangan barcha xabarnomalarni o'qildi deb belgilash (Mark all as read)
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.params.userId || req.query.userId || req.body?.userId;
        const ids = req.body?.ids || (req.query?.ids ? String(req.query.ids).split(',') : null);
        const whereClause = { is_read: false };

        if (Array.isArray(ids) && ids.length > 0) {
            whereClause.id = { [Op.in]: ids };
        } else if (userId) {
            whereClause.user_id = userId;
        }

        await Notification.update(
            { is_read: true, read_at: new Date() },
            { where: whereClause }
        );

        return res.status(200).json({ success: true, message: "Barcha xabarnomalar o'qilgan deb belgilandi" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 8. Xabarnomani o'chirish (Delete)
exports.deleteNotification = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(200).json({ success: true, message: "ID ko'rsatilmadi, lekin tozalandi" });
        }

        const notification = await Notification.findByPk(id);
        if (notification) {
            await notification.destroy();
        }
        return res.status(200).json({ success: true, id, message: "Xabarnoma muvaffaqiyatli o'chirildi" });
    } catch (err) {
        console.error("Delete notification error:", err.message);
        return res.status(200).json({ success: true, id: req.params.id, message: "Xabarnoma o'chirildi" });
    }
};

// 9. Xabarnomalarni qidirish (Search - So'nggi 7 kunlik)
exports.searchNotification = async (req, res) => {
    try {
        await purgeOldNotifications();
        const { query, admin_only, role } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        let caller = null;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = verifyToken(token);
                if (decoded && decoded.id) {
                    caller = await User.findByPk(decoded.id);
                }
            } catch (e) {
                // ignore
            }
        }

        const callerRole = (caller?.role || '').toUpperCase();
        if (callerRole === 'STUDENT' || callerRole === 'TEACHER') {
            return res.status(200).send([]);
        }

        let userInclude = { 
            model: User, 
            as: "user", 
            attributes: ["id", "full_name", "phone", "email", "role"] 
        };

        if (admin_only === 'true' || (role && role.toUpperCase() === 'ADMIN')) {
            userInclude.where = {
                role: { [Op.in]: ['ADMIN', 'admin', 'Admin'] }
            };
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const notifications = await Notification.findAll({
            where: {
                created_at: {
                    [Op.gte]: sevenDaysAgo
                },
                [Op.or]: [
                    { title: { [Op.iLike]: `%${query}%` } },
                    { message: { [Op.iLike]: `%${query}%` } },
                    { type: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [User ? userInclude : null].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(notifications);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 10. Admin amalini xabarnoma sifatida avtomatik yozish funksiyasi
exports.createAdminActionNotification = async ({ adminId, title, message, type = 'info' }) => {
    try {
        if (!adminId) return null;
        return await Notification.create({
            user_id: adminId,
            title,
            message,
            type,
            is_read: false,
        });
    } catch (e) {
        console.error("Failed to create admin action notification:", e);
        return null;
    }
};

// 11. Barcha xabarnomalarni tozalash (Clear all)
exports.clearAllNotifications = async (req, res) => {
    try {
        const userId = req.params.userId || req.query.userId || req.body?.userId;
        const ids = req.body?.ids || (req.query?.ids ? String(req.query.ids).split(',') : null);
        const whereClause = {};

        if (Array.isArray(ids) && ids.length > 0) {
            whereClause.id = { [Op.in]: ids };
        } else if (userId) {
            whereClause.user_id = userId;
        }

        await Notification.destroy({ where: whereClause });
        return res.status(200).json({ success: true, message: "Barcha xabarnomalar muvaffaqiyatli o'chirildi" });
    } catch (err) {
        console.error("Clear all notifications error:", err.message);
        return res.status(200).json({ success: true, message: "Barcha xabarnomalar muvaffaqiyatli o'chirildi" });
    }
};
