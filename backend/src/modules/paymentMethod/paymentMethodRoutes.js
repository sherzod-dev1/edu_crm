const express = require("express");
const router = express.Router();
const paymentMethodController = require("./paymentMethodController");

/**
 * @swagger
 * tags:
 *   name: PaymentMethods
 *   description: To'lov usullarini (Payme, Click, Naqd va h.k.) boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Click"
 *         code:
 *           type: string
 *           example: "click"
 *         description:
 *           type: string
 *           example: "Click to'lov tizimi orqali to'lov"
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "active"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     PaymentMethodInput:
 *       type: object
 *       required:
 *         - name
 *         - code
 *       properties:
 *         name:
 *           type: string
 *           example: "Click"
 *         code:
 *           type: string
 *           example: "click"
 *         description:
 *           type: string
 *           example: "Click to'lov tizimi orqali to'lov"
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "active"
 */

/**
 * @swagger
 * /payment-methods:
 *   post:
 *     summary: Yangi to'lov usulini yaratish
 *     tags: [PaymentMethods]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentMethodInput'
 *     responses:
 *       201:
 *         description: To'lov usuli muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Noto'g'ri so'rov yoki unikal kod takrorlandi
 *       500:
 *         description: Server xatosi
 */
router.post("/payment-methods", paymentMethodController.createPaymentMethod);

/**
 * @swagger
 * /payment-methods:
 *   get:
 *     summary: Barcha to'lov usullari ro'yxatini olish
 *     tags: [PaymentMethods]
 *     responses:
 *       200:
 *         description: To'lov usullari ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentMethod'
 *       500:
 *         description: Server xatosi
 */
router.get("/payment-methods", paymentMethodController.getPaymentMethod);

/**
 * @swagger
 * /payment-methods/search:
 *   get:
 *     summary: To'lov usullarini qidirish
 *     tags: [PaymentMethods]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (name, code, description, status)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan to'lov usullari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/payment-methods/search", paymentMethodController.searchPaymentMethod);

/**
 * @swagger
 * /payment-methods/{id}:
 *   get:
 *     summary: ID bo'yicha bitta to'lov usulini olish
 *     tags: [PaymentMethods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: To'lov usulining ID si
 *     responses:
 *       200:
 *         description: To'lov usuli ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       404:
 *         description: To'lov usuli topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/payment-methods/:id", paymentMethodController.getPaymentMethodById);

/**
 * @swagger
 * /payment-methods/{id}:
 *   put:
 *     summary: To'lov usuli ma'lumotlarini yangilash
 *     tags: [PaymentMethods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan to'lov usulining ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentMethodInput'
 *     responses:
 *       200:
 *         description: To'lov usuli muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi yoki unikal kod takrorlandi
 *       404:
 *         description: To'lov usuli topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/payment-methods/:id", paymentMethodController.updatePaymentMethod);

/**
 * @swagger
 * /payment-methods/{id}:
 *   delete:
 *     summary: To'lov usulini o'chirish
 *     tags: [PaymentMethods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan to'lov usulining ID si
 *     responses:
 *       200:
 *         description: To'lov usuli muvaffaqiyatli o'chirildi
 *       404:
 *         description: To'lov usuli topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/payment-methods/:id", paymentMethodController.deletePaymentMethod);

module.exports = router;
