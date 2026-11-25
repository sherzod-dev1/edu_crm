const express = require("express");
const router = express.Router();
const groupController = require("./groupController");

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: O'quv guruhlarini boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         course_id:
 *           type: integer
 *           example: 1
 *         teacher_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         name:
 *           type: string
 *           example: "NodeJS-24"
 *         start_date:
 *           type: string
 *           format: date
 *           example: "2026-10-01"
 *         end_date:
 *           type: string
 *           format: date
 *           example: "2027-04-01"
 *         start_time:
 *           type: string
 *           example: "18:30:00"
 *         end_time:
 *           type: string
 *           example: "20:30:00"
 *         days:
 *           type: string
 *           example: "Dush-Chor-Juma"
 *         capacity:
 *           type: integer
 *           example: 15
 *         status:
 *           type: string
 *           enum: [active, planned, completed, cancelled, inactive]
 *           example: "active"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     GroupInput:
 *       type: object
 *       required:
 *         - course_id
 *         - name
 *       properties:
 *         course_id:
 *           type: integer
 *           example: 1
 *         teacher_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         name:
 *           type: string
 *           example: "NodeJS-24"
 *         start_date:
 *           type: string
 *           format: date
 *           example: "2026-10-01"
 *         end_date:
 *           type: string
 *           format: date
 *           example: "2027-04-01"
 *         start_time:
 *           type: string
 *           example: "18:30:00"
 *         end_time:
 *           type: string
 *           example: "20:30:00"
 *         days:
 *           type: string
 *           example: "Dush-Chor-Juma"
 *         capacity:
 *           type: integer
 *           example: 15
 *         status:
 *           type: string
 *           enum: [active, planned, completed, cancelled, inactive]
 *           example: "active"
 */

/**
 * @swagger
 * /groups:
 *   post:
 *     summary: Yangi guruh yaratish
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupInput'
 *     responses:
 *       201:
 *         description: Guruh muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Kurs, o'qituvchi yoki filial topilmadi
 *       500:
 *         description: Server xatosi
 */
const { authenticate } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

router.post("/groups", authenticate, authorize('ADMIN'), groupController.createGroup);

/**
 * @swagger
 * /groups:
 *   get:
 *     summary: Barcha guruhlar ro'yxatini olish
 *     tags: [Groups]
 *     responses:
 *       200:
 *         description: Guruhlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       500:
 *         description: Server xatosi
 */
router.get("/groups", groupController.getGroup);

/**
 * @swagger
 * /groups/search:
 *   get:
 *     summary: Guruhlarni qidirish
 *     tags: [Groups]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (name, days, status)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos guruhlar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/groups/search", groupController.searchGroup);

/**
 * @swagger
 * /groups/{id}:
 *   get:
 *     summary: ID bo'yicha bitta guruhni olish
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Guruh ID si
 *     responses:
 *       200:
 *         description: Guruh ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       404:
 *         description: Guruh topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/groups/:id", groupController.getGroupById);

/**
 * @swagger
 * /groups/{id}:
 *   put:
 *     summary: Guruh ma'lumotlarini yangilash
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan guruh ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupInput'
 *     responses:
 *       200:
 *         description: Guruh ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Guruh, kurs, o'qituvchi yoki filial topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/groups/:id", authenticate, authorize('ADMIN'), groupController.updateGroup);

/**
 * @swagger
 * /groups/{id}:
 *   delete:
 *     summary: Guruhni o'chirish
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan guruh ID si
 *     responses:
 *       200:
 *         description: Guruh muvaffaqiyatli o'chirildi
 *       404:
 *         description: Guruh topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/groups/:id", authenticate, authorize('ADMIN'), groupController.deleteGroup);

module.exports = router;
