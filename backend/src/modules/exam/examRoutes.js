const express = require("express");
const router = express.Router();
const examController = require("./examController");

/**
 * @swagger
 * tags:
 *   name: Exams
 *   description: Imtihonlar va test sinovlarini boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Exam:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         course_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         group_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         module_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         teacher_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         title:
 *           type: string
 *           example: "JavaScript Asoslari bo'yicha Yakuniy Imtihon"
 *         description:
 *           type: string
 *           example: "Modul yakuni bo'yicha amaliy va test sinovi"
 *         exam_date:
 *           type: string
 *           format: date
 *           example: "2026-10-15"
 *         max_score:
 *           type: number
 *           format: float
 *           example: 100.00
 *         passing_score:
 *           type: number
 *           format: float
 *           example: 60.00
 *         status:
 *           type: string
 *           enum: [planned, ongoing, completed, cancelled]
 *           example: "planned"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ExamInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         course_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         group_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         module_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         teacher_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         title:
 *           type: string
 *           example: "JavaScript Asoslari bo'yicha Yakuniy Imtihon"
 *         description:
 *           type: string
 *           example: "Modul yakuni bo'yicha amaliy va test sinovi"
 *         exam_date:
 *           type: string
 *           format: date
 *           example: "2026-10-15"
 *         max_score:
 *           type: number
 *           format: float
 *           example: 100.00
 *         passing_score:
 *           type: number
 *           format: float
 *           example: 60.00
 *         status:
 *           type: string
 *           enum: [planned, ongoing, completed, cancelled]
 *           example: "planned"
 */

/**
 * @swagger
 * /exams:
 *   post:
 *     summary: Yangi imtihon yaratish
 *     tags: [Exams]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExamInput'
 *     responses:
 *       201:
 *         description: Imtihon muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Kurs, guruh, modul yoki o'qituvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/exams", examController.createExam);

/**
 * @swagger
 * /exams:
 *   get:
 *     summary: Barcha imtihonlar ro'yxatini olish
 *     tags: [Exams]
 *     responses:
 *       200:
 *         description: Imtihonlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Exam'
 *       500:
 *         description: Server xatosi
 */
router.get("/exams", examController.getExam);

/**
 * @swagger
 * /exams/search:
 *   get:
 *     summary: Imtihonlarni qidirish
 *     tags: [Exams]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (title, description, status bo'yicha)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan imtihonlar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Exam'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/exams/search", examController.searchExam);

/**
 * @swagger
 * /exams/{id}:
 *   get:
 *     summary: ID bo'yicha bitta imtihonni olish
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Imtihon ID si
 *     responses:
 *       200:
 *         description: Imtihon ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       404:
 *         description: Exam topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/exams/:id", examController.getExamById);

/**
 * @swagger
 * /exams/{id}:
 *   put:
 *     summary: Imtihon ma'lumotlarini yangilash
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan imtihon ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExamInput'
 *     responses:
 *       200:
 *         description: Imtihon ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Exam yoki bog'langan obyektlar topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/exams/:id", examController.updateExam);

/**
 * @swagger
 * /exams/{id}:
 *   delete:
 *     summary: Imtihonni o'chirish
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan imtihon ID si
 *     responses:
 *       200:
 *         description: Imtihon muvaffaqiyatli o'chirildi
 *       404:
 *         description: Exam topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/exams/:id", examController.deleteExam);

module.exports = router;
