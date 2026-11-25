const express = require("express");
const router = express.Router();
const courseModuleController = require("./courseModuleController");

/**
 * @swagger
 * tags:
 *   name: CourseModules
 *   description: Kurs modullari (bo'limlari)ni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CourseModule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         course_id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "1-Modul: Asosiy JavaScript tushunchalari"
 *         description:
 *           type: string
 *           example: "Ushbu modulda JavaScript sintaksisi, o'zgaruvchilar va funksiyalar o'rgatiladi"
 *         order_number:
 *           type: integer
 *           example: 1
 *         duration_hours:
 *           type: integer
 *           example: 24
 *         status:
 *           type: string
 *           enum: [active, inactive, draft]
 *           example: "active"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     CourseModuleInput:
 *       type: object
 *       required:
 *         - course_id
 *         - title
 *       properties:
 *         course_id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "1-Modul: Asosiy JavaScript tushunchalari"
 *         description:
 *           type: string
 *           example: "Ushbu modulda JavaScript sintaksisi, o'zgaruvchilar va funksiyalar o'rgatiladi"
 *         order_number:
 *           type: integer
 *           example: 1
 *         duration_hours:
 *           type: integer
 *           example: 24
 *         status:
 *           type: string
 *           enum: [active, inactive, draft]
 *           example: "active"
 */

/**
 * @swagger
 * /course-modules:
 *   post:
 *     summary: Yangi kurs modulini yaratish
 *     tags: [CourseModules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseModuleInput'
 *     responses:
 *       201:
 *         description: Kurs moduli muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseModule'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Belgilangan course_id ga ega kurs topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/course-modules", courseModuleController.createCourseModule);

/**
 * @swagger
 * /course-modules:
 *   get:
 *     summary: Barcha kurs modullari ro'yxatini olish
 *     tags: [CourseModules]
 *     responses:
 *       200:
 *         description: Kurs modullari ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CourseModule'
 *       500:
 *         description: Server xatosi
 */
router.get("/course-modules", courseModuleController.getCourseModule);

/**
 * @swagger
 * /course-modules/search:
 *   get:
 *     summary: Kurs modullarini qidirish
 *     tags: [CourseModules]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (title, description, status bo'yicha)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan modullar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CourseModule'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/course-modules/search", courseModuleController.searchCourseModule);

/**
 * @swagger
 * /course-modules/{id}:
 *   get:
 *     summary: ID bo'yicha bitta kurs modulini olish
 *     tags: [CourseModules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Modulning ID si
 *     responses:
 *       200:
 *         description: Modul ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseModule'
 *       404:
 *         description: CourseModule topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/course-modules/:id", courseModuleController.getCourseModuleById);

/**
 * @swagger
 * /course-modules/{id}:
 *   put:
 *     summary: Kurs moduli ma'lumotlarini yangilash
 *     tags: [CourseModules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan modulning ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseModuleInput'
 *     responses:
 *       200:
 *         description: Kurs moduli muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseModule'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: CourseModule yoki kurs topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/course-modules/:id", courseModuleController.updateCourseModule);

/**
 * @swagger
 * /course-modules/{id}:
 *   delete:
 *     summary: Kurs modulini o'chirish
 *     tags: [CourseModules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan modulning ID si
 *     responses:
 *       200:
 *         description: Kurs moduli muvaffaqiyatli o'chirildi
 *       404:
 *         description: CourseModule topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/course-modules/:id", courseModuleController.deleteCourseModule);

module.exports = router;
