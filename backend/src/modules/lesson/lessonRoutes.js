const express = require("express");
const router = express.Router();
const lessonController = require("./lessonController");

/**
 * @swagger
 * tags:
 *   name: Lessons
 *   description: Dars jadvallari va mashg'ulotlarni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Lesson:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         group_id:
 *           type: integer
 *           example: 1
 *         teacher_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         classroom_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         module_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         lesson_date:
 *           type: string
 *           format: date
 *           example: "2026-10-05"
 *         start_time:
 *           type: string
 *           example: "18:30:00"
 *         end_time:
 *           type: string
 *           example: "20:30:00"
 *         topic:
 *           type: string
 *           example: "Asinxron JavaScript: Promises va Async/Await"
 *         description:
 *           type: string
 *           example: "Event loop, mikro va makro topshiriqlar, fetch bilan amaliy mashg'ulot"
 *         status:
 *           type: string
 *           enum: [planned, completed, cancelled, in_progress]
 *           example: "planned"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     LessonInput:
 *       type: object
 *       required:
 *         - group_id
 *         - lesson_date
 *       properties:
 *         group_id:
 *           type: integer
 *           example: 1
 *         teacher_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         classroom_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         module_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         lesson_date:
 *           type: string
 *           format: date
 *           example: "2026-10-05"
 *         start_time:
 *           type: string
 *           example: "18:30:00"
 *         end_time:
 *           type: string
 *           example: "20:30:00"
 *         topic:
 *           type: string
 *           example: "Asinxron JavaScript: Promises va Async/Await"
 *         description:
 *           type: string
 *           example: "Event loop, mikro va makro topshiriqlar, fetch bilan amaliy mashg'ulot"
 *         status:
 *           type: string
 *           enum: [planned, completed, cancelled, in_progress]
 *           example: "planned"
 */

/**
 * @swagger
 * /lessons:
 *   post:
 *     summary: Yangi dars yaratish
 *     tags: [Lessons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LessonInput'
 *     responses:
 *       201:
 *         description: Dars muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Guruh, o'qituvchi, xona yoki modul topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/lessons", lessonController.createLesson);

/**
 * @swagger
 * /lessons:
 *   get:
 *     summary: Barcha darslar ro'yxatini olish
 *     tags: [Lessons]
 *     responses:
 *       200:
 *         description: Darslar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lesson'
 *       500:
 *         description: Server xatosi
 */
router.get("/lessons", lessonController.getLesson);

/**
 * @swagger
 * /lessons/search:
 *   get:
 *     summary: Darslarni qidirish
 *     tags: [Lessons]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (topic, description, status)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan darslar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/lessons/search", lessonController.searchLesson);

/**
 * @swagger
 * /lessons/{id}:
 *   get:
 *     summary: ID bo'yicha bitta darsni olish
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dars ID si
 *     responses:
 *       200:
 *         description: Dars ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Lesson topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/lessons/:id", lessonController.getLessonById);

/**
 * @swagger
 * /lessons/{id}:
 *   put:
 *     summary: Dars ma'lumotlarini yangilash
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan dars ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LessonInput'
 *     responses:
 *       200:
 *         description: Dars ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Lesson, guruh, o'qituvchi, xona yoki modul topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/lessons/:id", lessonController.updateLesson);

/**
 * @swagger
 * /lessons/{id}:
 *   delete:
 *     summary: Darsni o'chirish
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan dars ID si
 *     responses:
 *       200:
 *         description: Dars muvaffaqiyatli o'chirildi
 *       404:
 *         description: Lesson topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/lessons/:id", lessonController.deleteLesson);

module.exports = router;
