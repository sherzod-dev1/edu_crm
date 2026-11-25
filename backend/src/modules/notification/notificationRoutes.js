const express = require("express");
const router = express.Router();
const notificationController = require("./notificationController");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Xabarnomalar va bildirishnomalarni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "To'lov qabul qilindi"
 *         message:
 *           type: string
 *           example: "Sizning hisobingizga 1,200,000 UZS muvaffaqiyatli qabul qilindi."
 *         type:
 *           type: string
 *           example: "payment"
 *         is_read:
 *           type: boolean
 *           example: false
 *         read_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         created_at:
 *           type: string
 *           format: date-time
 *     NotificationInput:
 *       type: object
 *       required:
 *         - user_id
 *         - title
 *         - message
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Yangi dars jadvali"
 *         message:
 *           type: string
 *           example: "Ertaga soat 14:00 da Backend kursi bo'yicha yangi dars boshlanadi."
 *         type:
 *           type: string
 *           example: "lesson"
 *         is_read:
 *           type: boolean
 *           example: false
 *         read_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 */

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Yangi xabarnoma yaratish
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationInput'
 *     responses:
 *       201:
 *         description: Xabarnoma muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/notifications", notificationController.createNotification);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Barcha xabarnomalar ro'yxatini olish
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Xabarnomalar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       500:
 *         description: Server xatosi
 */
router.get("/notifications", notificationController.getNotification);

/**
 * @swagger
 * /notifications/search:
 *   get:
 *     summary: Xabarnomalarni qidirish
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (title, message, type)
 *     responses:
 *       200:
 *         description: Qidiruv natijalari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/notifications/search", notificationController.searchNotification);

/**
 * @swagger
 * /notifications/user/{userId}:
 *   get:
 *     summary: Foydalanuvchining barcha xabarnomalarini olish
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Foydalanuvchi ID si
 *     responses:
 *       200:
 *         description: Foydalanuvchi xabarnomalari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/notifications/user/:userId", notificationController.getUserNotifications);

/**
 * @swagger
 * /notifications/read-all/{userId}:
 *   patch:
 *     summary: Foydalanuvchining barcha xabarnomalarini o'qildi deb belgilash
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Foydalanuvchi ID si
 *     responses:
 *       200:
 *         description: Barcha xabarnomalar o'qilgan deb belgilandi
 *       404:
 *         description: Foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.patch("/notifications/read-all", notificationController.markAllAsRead);
router.patch("/notifications/read-all/:userId", notificationController.markAllAsRead);
router.delete("/notifications/clear-all", notificationController.clearAllNotifications);
router.delete("/notifications/clear-all/:userId", notificationController.clearAllNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Xabarnomani o'qildi deb belgilash
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Xabarnoma ID si
 *     responses:
 *       200:
 *         description: Xabarnoma o'qildi holatiga o'tkazildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notification topilmadi
 *       500:
 *         description: Server xatosi
 */
router.patch("/notifications/:id/read", notificationController.markAsRead);

/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: ID bo'yicha bitta xabarnomani olish
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Xabarnoma ID si
 *     responses:
 *       200:
 *         description: Xabarnoma ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notification topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/notifications/:id", notificationController.getNotificationById);

/**
 * @swagger
 * /notifications/{id}:
 *   put:
 *     summary: Xabarnoma ma'lumotlarini yangilash
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan xabarnoma ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationInput'
 *     responses:
 *       200:
 *         description: Xabarnoma muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Notification yoki foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/notifications/:id", notificationController.updateNotification);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Xabarnomani o'chirish
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan xabarnoma ID si
 *     responses:
 *       200:
 *         description: Xabarnoma muvaffaqiyatli o'chirildi
 *       404:
 *         description: Notification topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/notifications/:id", notificationController.deleteNotification);

module.exports = router;
