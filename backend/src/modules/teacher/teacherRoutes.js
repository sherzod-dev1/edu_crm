const express = require("express");
const router = express.Router();
const teacherController = require("./teacherController");

/**
 * @swagger
 * tags:
 *   name: Teachers
 *   description: O'qituvchilarni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Teacher:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 2
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         specialization:
 *           type: string
 *           example: "Node.js & Backend Developer"
 *         experience_year:
 *           type: integer
 *           example: 3
 *         bio:
 *           type: string
 *           example: "Tajribali backend dasturchi va mentor"
 *         salary_type:
 *           type: string
 *           example: "fixed"
 *         salary_amount:
 *           type: number
 *           example: 8000000.00
 *         status:
 *           type: string
 *           example: "active"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateTeacherInput:
 *       type: object
 *       required:
 *         - user_id
 *         - specialization
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 2
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         specialization:
 *           type: string
 *           example: "Node.js & Express.js"
 *         experience_year:
 *           type: integer
 *           example: 3
 *         bio:
 *           type: string
 *           example: "Backend bo'yicha 3 yillik tajribaga ega"
 *         salary_type:
 *           type: string
 *           enum: [fixed, percentage, hourly]
 *           example: "fixed"
 *         salary_amount:
 *           type: number
 *           example: 8000000.00
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "active"
 *     UpdateTeacherInput:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 2
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         specialization:
 *           type: string
 *           example: "Senior Node.js Developer"
 *         experience_year:
 *           type: integer
 *           example: 4
 *         bio:
 *           type: string
 *           example: "Katta tajribaga ega backend mentor"
 *         salary_type:
 *           type: string
 *           enum: [fixed, percentage, hourly]
 *           example: "fixed"
 *         salary_amount:
 *           type: number
 *           example: 10000000.00
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "active"
 */

/**
 * @swagger
 * /teachers:
 *   post:
 *     summary: Yangi o'qituvchi qo'shish
 *     tags: [Teachers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTeacherInput'
 *     responses:
 *       201:
 *         description: O'qituvchi muvaffaqiyatli qo'shildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Teacher'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: User yoki Branch topilmadi
 *       500:
 *         description: Server xatosi
 */
const { authenticate } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

router.post("/teachers", authenticate, authorize('ADMIN'), teacherController.createTeacher);

/**
 * @swagger
 * /teachers/search:
 *   get:
 *     summary: O'qituvchilarni qidirish (Mutaxassislik, bio, maosh turi yoki status bo'yicha)
 *     tags: [Teachers]
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
 *                 $ref: '#/components/schemas/Teacher'
 *       400:
 *         description: Qidiruv parametri kiritilmagan
 *       500:
 *         description: Server xatosi
 */
router.get("/teachers/search", teacherController.searchTeacher);

/**
 * @swagger
 * /teachers:
 *   get:
 *     summary: Barcha o'qituvchilar ro'yxatini olish
 *     tags: [Teachers]
 *     responses:
 *       200:
 *         description: O'qituvchilar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Teacher'
 *       500:
 *         description: Server xatosi
 */
router.get("/teachers", teacherController.getTeacher);

/**
 * @swagger
 * /teachers/{id}:
 *   get:
 *     summary: ID bo'yicha bitta o'qituvchini olish
 *     tags: [Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'qituvchi ID si
 *     responses:
 *       200:
 *         description: O'qituvchi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Teacher'
 *       404:
 *         description: O'qituvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/teachers/:id", teacherController.getTeacherById);

/**
 * @swagger
 * /teachers/{id}:
 *   put:
 *     summary: ID bo'yicha o'qituvchi ma'lumotlarini yangilash
 *     tags: [Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'qituvchi ID si
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTeacherInput'
 *     responses:
 *       200:
 *         description: O'qituvchi ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Teacher'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: O'qituvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/teachers/:id", authenticate, authorize('ADMIN'), teacherController.updateTeacher);

/**
 * @swagger
 * /teachers/{id}:
 *   delete:
 *     summary: ID bo'yicha o'qituvchini o'chirish
 *     tags: [Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'qituvchi ID si
 *     responses:
 *       200:
 *         description: O'qituvchi muvaffaqiyatli o'chirildi
 *       404:
 *         description: O'qituvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/teachers/:id", authenticate, authorize('ADMIN'), teacherController.deleteTeacher);

module.exports = router;
