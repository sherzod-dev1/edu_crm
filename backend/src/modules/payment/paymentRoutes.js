const express = require("express");
const router = express.Router();
const paymentController = require("./paymentController");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Talabalar to'lovlarini boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         invoice_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         payment_method_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         amount:
 *           type: number
 *           format: float
 *           example: 1200000.00
 *         transaction_id:
 *           type: string
 *           example: "TXN-98471203"
 *         payment_date:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [completed, pending, failed, refunded, cancelled]
 *           example: "completed"
 *         note:
 *           type: string
 *           example: "Oktyabr oyi kursi uchun to'lov"
 *         created_by:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     PaymentInput:
 *       type: object
 *       required:
 *         - student_id
 *         - amount
 *       properties:
 *         student_id:
 *           type: integer
 *           example: 1
 *         invoice_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         payment_method_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         amount:
 *           type: number
 *           format: float
 *           example: 1200000.00
 *         transaction_id:
 *           type: string
 *           example: "TXN-98471203"
 *         status:
 *           type: string
 *           enum: [completed, pending, failed, refunded, cancelled]
 *           example: "completed"
 *         note:
 *           type: string
 *           example: "Oktyabr oyi kursi uchun to'lov"
 *         created_by:
 *           type: integer
 *           nullable: true
 *           example: 1
 */

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Yangi to'lov yozuvini yaratish
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInput'
 *     responses:
 *       201:
 *         description: To'lov muvaffaqiyatli saqlandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Talaba, to'lov usuli, hisob-faktura yoki foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
const { authenticate } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

router.post("/payments", authenticate, authorize('ADMIN', 'ACCOUNTANT'), paymentController.createPayment);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Barcha to'lovlar ro'yxatini olish
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: To'lovlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 *       500:
 *         description: Server xatosi
 */
router.get("/payments", paymentController.getPayment);

/**
 * @swagger
 * /payments/search:
 *   get:
 *     summary: To'lovlarni qidirish
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (transaction_id, status, note bo'yicha)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan to'lovlar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/payments/search", paymentController.searchPayment);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: ID bo'yicha bitta to'lov ma'lumotini olish
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: To'lov ID si
 *     responses:
 *       200:
 *         description: To'lov ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       404:
 *         description: To'lov topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/payments/:id", paymentController.getPaymentById);

/**
 * @swagger
 * /payments/{id}:
 *   put:
 *     summary: To'lov ma'lumotlarini yangilash
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan to'lov ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInput'
 *     responses:
 *       200:
 *         description: To'lov ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: To'lov, talaba yoki to'lov usuli topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/payments/:id", authenticate, authorize('ADMIN', 'ACCOUNTANT'), paymentController.updatePayment);

/**
 * @swagger
 * /payments/{id}:
 *   delete:
 *     summary: To'lov yozuvini o'chirish
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan to'lov ID si
 *     responses:
 *       200:
 *         description: To'lov yozuvi muvaffaqiyatli o'chirildi
 *       404:
 *         description: To'lov topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/payments/:id", authenticate, authorize('ADMIN', 'ACCOUNTANT'), paymentController.deletePayment);

module.exports = router;
