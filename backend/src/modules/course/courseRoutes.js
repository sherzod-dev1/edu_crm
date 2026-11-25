const express = require("express");
const router = express.Router();
const courseController = require("./courseController");

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Kurslarni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         name:
 *           type: string
 *           example: "Node.js Backend Dasturlash"
 *         slug:
 *           type: string
 *           example: "nodejs-backend-dasturlash-1234"
 *         description:
 *           type: string
 *           example: "Node.js, Express, PostgreSQL va Sequelize bo'yicha professional kurs"
 *         duration_months:
 *           type: integer
 *           example: 6
 *         price:
 *           type: number
 *           example: 1200000.00
 *         level:
 *           type: string
 *           example: "Intermediate"
 *         image:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/course.png"
 *         status:
 *           type: string
 *           example: "active"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateCourseInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         name:
 *           type: string
 *           example: "Node.js Backend Dasturlash"
 *         slug:
 *           type: string
 *           example: "nodejs-backend"
 *         description:
 *           type: string
 *           example: "Node.js, Express va PostgreSQL bo'yicha to'liq amaliy kurs"
 *         duration_months:
 *           type: integer
 *           example: 6
 *         price:
 *           type: number
 *           example: 1200000.00
 *         level:
 *           type: string
 *           enum: [Beginner, Intermediate, Advanced]
 *           example: "Beginner"
 *         image:
 *           type: string
 *           example: "https://example.com/nodejs.png"
 *         status:
 *           type: string
 *           enum: [active, inactive, draft]
 *           example: "active"
 *     UpdateCourseInput:
 *       type: object
 *       properties:
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         name:
 *           type: string
 *           example: "Node.js & Microservices Backend Dasturlash"
 *         slug:
 *           type: string
 *           example: "nodejs-microservices"
 *         description:
 *           type: string
 *           example: "Kengaytirilgan Node.js kursi"
 *         duration_months:
 *           type: integer
 *           example: 8
 *         price:
 *           type: number
 *           example: 1500000.00
 *         level:
 *           type: string
 *           enum: [Beginner, Intermediate, Advanced]
 *           example: "Intermediate"
 *         image:
 *           type: string
 *           example: "https://example.com/nodejs-pro.png"
 *         status:
 *           type: string
 *           enum: [active, inactive, draft]
 *           example: "active"
 */

/**
 * @swagger
 * /courses:
 *   post:
 *     summary: Yangi kurs qo'shish
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCourseInput'
 *     responses:
 *       201:
 *         description: Kurs muvaffaqiyatli qo'shildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: Filial topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/courses", courseController.createCourse);

/**
 * @swagger
 * /courses/search:
 *   get:
 *     summary: Kurslarni qidirish (Nomi, slug, tavsifi yoki darajasi bo'yicha)
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi
 *     responses:
 *       200:
 *         description: Qidiruv natijalari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       400:
 *         description: Qidiruv parametri kiritilmagan
 *       500:
 *         description: Server xatosi
 */
router.get("/courses/search", courseController.searchCourse);

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Barcha kurslar ro'yxatini olish
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Kurslar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       500:
 *         description: Server xatosi
 */
router.get("/courses", courseController.getCourse);

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     summary: ID bo'yicha bitta kursni olish
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kurs ID si
 *     responses:
 *       200:
 *         description: Kurs ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Kurs topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/courses/:id", courseController.getCourseById);

/**
 * @swagger
 * /courses/{id}:
 *   put:
 *     summary: ID bo'yicha kurs ma'lumotlarini yangilash
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kurs ID si
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCourseInput'
 *     responses:
 *       200:
 *         description: Kurs ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: Kurs topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/courses/:id", courseController.updateCourse);

/**
 * @swagger
 * /courses/{id}:
 *   delete:
 *     summary: ID bo'yicha kursni o'chirish
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kurs ID si
 *     responses:
 *       200:
 *         description: Kurs muvaffaqiyatli o'chirildi
 *       404:
 *         description: Kurs topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/courses/:id", courseController.deleteCourse);

module.exports = router;
