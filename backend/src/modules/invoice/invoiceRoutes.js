const express = require("express");
const router = express.Router();
const invoiceController = require("./invoiceController");

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Hisob-fakturalar (invoyslar)ni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         group_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         invoice_number:
 *           type: string
 *           example: "INV-202610-1001"
 *         amount:
 *           type: number
 *           format: float
 *           example: 1200000.00
 *         paid_amount:
 *           type: number
 *           format: float
 *           example: 0.00
 *         due_amount:
 *           type: number
 *           format: float
 *           example: 1200000.00
 *         due_date:
 *           type: string
 *           format: date
 *           example: "2026-10-10"
 *         description:
 *           type: string
 *           example: "Node.js kursi uchun 1-oylik to'lov invoysi"
 *         status:
 *           type: string
 *           enum: [unpaid, partially_paid, paid, cancelled, overdue]
 *           example: "unpaid"
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
 *     InvoiceInput:
 *       type: object
 *       required:
 *         - student_id
 *         - amount
 *       properties:
 *         student_id:
 *           type: integer
 *           example: 1
 *         group_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         invoice_number:
 *           type: string
 *           example: "INV-202610-1001"
 *         amount:
 *           type: number
 *           format: float
 *           example: 1200000.00
 *         paid_amount:
 *           type: number
 *           format: float
 *           example: 0.00
 *         due_amount:
 *           type: number
 *           format: float
 *           example: 1200000.00
 *         due_date:
 *           type: string
 *           format: date
 *           example: "2026-10-10"
 *         description:
 *           type: string
 *           example: "Node.js kursi uchun 1-oylik to'lov invoysi"
 *         status:
 *           type: string
 *           enum: [unpaid, partially_paid, paid, cancelled, overdue]
 *           example: "unpaid"
 *         created_by:
 *           type: integer
 *           nullable: true
 *           example: 1
 */

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Yangi hisob-faktura yaratish
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceInput'
 *     responses:
 *       201:
 *         description: Hisob-faktura muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Talaba, guruh yoki foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/invoices", invoiceController.createInvoice);

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Barcha hisob-fakturalar ro'yxatini olish
 *     tags: [Invoices]
 *     responses:
 *       200:
 *         description: Hisob-fakturalar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Invoice'
 *       500:
 *         description: Server xatosi
 */
router.get("/invoices", invoiceController.getInvoice);

/**
 * @swagger
 * /invoices/search:
 *   get:
 *     summary: Hisob-fakturalarni qidirish
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (invoice_number, description, status)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan hisob-fakturalar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/invoices/search", invoiceController.searchInvoice);

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: ID bo'yicha bitta hisob-fakturani olish
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hisob-faktura ID si
 *     responses:
 *       200:
 *         description: Hisob-faktura ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Hisob-faktura topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/invoices/:id", invoiceController.getInvoiceById);

/**
 * @swagger
 * /invoices/{id}:
 *   put:
 *     summary: Hisob-faktura ma'lumotlarini yangilash
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan hisob-faktura ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceInput'
 *     responses:
 *       200:
 *         description: Hisob-faktura ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Hisob-faktura, talaba yoki guruh topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/invoices/:id", invoiceController.updateInvoice);

/**
 * @swagger
 * /invoices/{id}:
 *   delete:
 *     summary: Hisob-fakturani o'chirish
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan hisob-faktura ID si
 *     responses:
 *       200:
 *         description: Hisob-faktura muvaffaqiyatli o'chirildi
 *       404:
 *         description: Hisob-faktura topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/invoices/:id", invoiceController.deleteInvoice);

module.exports = router;
