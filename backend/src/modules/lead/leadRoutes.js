const express = require("express");
const router = express.Router();
const leadController = require("./leadController");

/**
 * @swagger
 * tags:
 *   name: Leads
 *   description: Potensial mijozlar (Lidlar) bilan ishlash bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Lead:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         assigned_to:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         full_name:
 *           type: string
 *           example: "Javohir Toshmatov"
 *         phone:
 *           type: string
 *           example: "+998901234567"
 *         email:
 *           type: string
 *           nullable: true
 *           example: "javohir@example.com"
 *         source:
 *           type: string
 *           example: "telegram"
 *         interested_course_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         status:
 *           type: string
 *           example: "new"
 *         note:
 *           type: string
 *           nullable: true
 *           example: "Kechki guruhga qatnashmoqchi"
 *         next_follow_up:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-10-05T10:00:00.000Z"
 *         converted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     LeadInput:
 *       type: object
 *       required:
 *         - full_name
 *         - phone
 *       properties:
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         assigned_to:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         full_name:
 *           type: string
 *           example: "Javohir Toshmatov"
 *         phone:
 *           type: string
 *           example: "+998901234567"
 *         email:
 *           type: string
 *           nullable: true
 *           example: "javohir@example.com"
 *         source:
 *           type: string
 *           example: "telegram"
 *         interested_course_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         status:
 *           type: string
 *           example: "new"
 *         note:
 *           type: string
 *           nullable: true
 *           example: "Kechki guruhga qatnashmoqchi"
 *         next_follow_up:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-10-05T10:00:00.000Z"
 */

/**
 * @swagger
 * /leads:
 *   post:
 *     summary: Yangi lid yaratish
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeadInput'
 *     responses:
 *       201:
 *         description: Lid muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Filial, mas'ul xodim yoki kurs topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/leads", leadController.createLead);

/**
 * @swagger
 * /leads:
 *   get:
 *     summary: Barcha lidlar ro'yxatini olish
 *     tags: [Leads]
 *     responses:
 *       200:
 *         description: Lidlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lead'
 *       500:
 *         description: Server xatosi
 */
router.get("/leads", leadController.getLead);

/**
 * @swagger
 * /leads/search:
 *   get:
 *     summary: L规范larni qidirish
 *     tags: [Leads]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (full_name, phone, email, source, status)
 *     responses:
 *       200:
 *         description: Qidiruv natijalari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/leads/search", leadController.searchLead);

/**
 * @swagger
 * /leads/{id}/convert:
 *   patch:
 *     summary: Lidni konvertatsiya qilish (Talabaga aylantirish / O'quvchi bo'ldi deb belgilash)
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lid ID si
 *     responses:
 *       200:
 *         description: Lid muvaffaqiyatli konvertatsiya qilindi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       404:
 *         description: Lead topilmadi
 *       500:
 *         description: Server xatosi
 */
router.patch("/leads/:id/convert", leadController.convertLead);

/**
 * @swagger
 * /leads/{id}:
 *   get:
 *     summary: ID bo'yicha bitta lidni olish
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lid ID si
 *     responses:
 *       200:
 *         description: Lid ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       404:
 *         description: Lead topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/leads/:id", leadController.getLeadById);

/**
 * @swagger
 * /leads/{id}:
 *   put:
 *     summary: Lid ma'lumotlarini yangilash
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan lid ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeadInput'
 *     responses:
 *       200:
 *         description: Lid muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Lid yoki bog'liq filial/xodim/kurs topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/leads/:id", leadController.updateLead);

/**
 * @swagger
 * /leads/{id}:
 *   delete:
 *     summary: Lidni o'chirish
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan lid ID si
 *     responses:
 *       200:
 *         description: Lid muvaffaqiyatli o'chirildi
 *       404:
 *         description: Lead topilmadi
 *       500:
 *         description: Server xatosi
 */
const { authenticate } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

router.delete("/leads/:id", authenticate, authorize('ADMIN'), leadController.deleteLead);

module.exports = router;
