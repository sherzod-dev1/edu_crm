const express = require("express");
const router = express.Router();
const trialLessonController = require("./trialLessonController");

/**
 * @swagger
 * tags:
 *   name: TrialLessons
 *   description: Sinov darslarini (Trial Lessons) rejalashtirish va boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TrialLesson:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         lead_id:
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
 *         classroom_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         trial_date:
 *           type: string
 *           format: date
 *           example: "2026-10-10"
 *         start_time:
 *           type: string
 *           example: "14:00:00"
 *         end_time:
 *           type: string
 *           example: "15:30:00"
 *         status:
 *           type: string
 *           example: "scheduled"
 *         feedback:
 *           type: string
 *           nullable: true
 *           example: "O'quvchi darsdan juda mamnun bo'ldi va kursga yozildi"
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
 *     TrialLessonInput:
 *       type: object
 *       required:
 *         - lead_id
 *         - course_id
 *         - trial_date
 *       properties:
 *         lead_id:
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
 *         classroom_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         trial_date:
 *           type: string
 *           format: date
 *           example: "2026-10-10"
 *         start_time:
 *           type: string
 *           example: "14:00:00"
 *         end_time:
 *           type: string
 *           example: "15:30:00"
 *         status:
 *           type: string
 *           example: "scheduled"
 *         feedback:
 *           type: string
 *           nullable: true
 *           example: "O'quvchi darsdan juda mamnun bo'ldi"
 *         created_by:
 *           type: integer
 *           nullable: true
 *           example: 1
 */

/**
 * @swagger
 * /trial-lessons:
 *   post:
 *     summary: Yangi sinov darsi rejalashtirish
 *     tags: [TrialLessons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrialLessonInput'
 *     responses:
 *       201:
 *         description: Sinov darsi muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrialLesson'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Bog'liq lid, kurs, o'qituvchi, filial yoki xona topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/trial-lessons", trialLessonController.createTrialLesson);

/**
 * @swagger
 * /trial-lessons:
 *   get:
 *     summary: Barcha sinov darslari ro'yxatini olish
 *     tags: [TrialLessons]
 *     responses:
 *       200:
 *         description: Sinov darslari ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TrialLesson'
 *       500:
 *         description: Server xatosi
 */
router.get("/trial-lessons", trialLessonController.getTrialLesson);

/**
 * @swagger
 * /trial-lessons/search:
 *   get:
 *     summary: Sinov darslarini qidirish
 *     tags: [TrialLessons]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (status, feedback)
 *     responses:
 *       200:
 *         description: Qidiruv natijalari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TrialLesson'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/trial-lessons/search", trialLessonController.searchTrialLesson);

/**
 * @swagger
 * /trial-lessons/{id}:
 *   get:
 *     summary: ID bo'yicha bitta sinov darsini olish
 *     tags: [TrialLessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sinov darsi ID si
 *     responses:
 *       200:
 *         description: Sinov darsi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrialLesson'
 *       404:
 *         description: TrialLesson topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/trial-lessons/:id", trialLessonController.getTrialLessonById);

/**
 * @swagger
 * /trial-lessons/{id}:
 *   put:
 *     summary: Sinov darsi ma'lumotlarini yangilash
 *     tags: [TrialLessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan sinov darsi ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrialLessonInput'
 *     responses:
 *       200:
 *         description: Sinov darsi muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrialLesson'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Sinov darsi yoki bog'liq obyektlar topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/trial-lessons/:id", trialLessonController.updateTrialLesson);

/**
 * @swagger
 * /trial-lessons/{id}:
 *   delete:
 *     summary: Sinov darsini o'chirish
 *     tags: [TrialLessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan sinov darsi ID si
 *     responses:
 *       200:
 *         description: Sinov darsi muvaffaqiyatli o'chirildi
 *       404:
 *         description: TrialLesson topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/trial-lessons/:id", trialLessonController.deleteTrialLesson);

module.exports = router;
