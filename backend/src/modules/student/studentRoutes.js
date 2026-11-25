const express = require("express");
const router = express.Router();
const studentController = require("./studentController");

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: O'quvchilarni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
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
 *         birth_date:
 *           type: string
 *           format: date
 *           example: "2008-05-20"
 *         gender:
 *           type: string
 *           example: "Erkak"
 *         address:
 *           type: string
 *           example: "Toshkent sh., Yunusobod tumani"
 *         parent_name:
 *           type: string
 *           example: "Vali Valiyev"
 *         parent_phone:
 *           type: string
 *           example: "+998901234567"
 *         education:
 *           type: string
 *           example: "Maktab o'quvchisi"
 *         status:
 *           type: string
 *           example: "active"
 *         joined_at:
 *           type: string
 *           format: date
 *           example: "2026-09-01"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateStudentInput:
 *       type: object
 *       required:
 *         - user_id
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 2
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         birth_date:
 *           type: string
 *           format: date
 *           example: "2008-05-20"
 *         gender:
 *           type: string
 *           enum: [Erkak, Ayol]
 *           example: "Erkak"
 *         address:
 *           type: string
 *           example: "Toshkent sh., Yunusobod tumani"
 *         parent_name:
 *           type: string
 *           example: "Vali Valiyev"
 *         parent_phone:
 *           type: string
 *           example: "+998901234567"
 *         education:
 *           type: string
 *           example: "Maktab o'quvchisi"
 *         status:
 *           type: string
 *           enum: [active, inactive, graduated, dropped]
 *           example: "active"
 *         joined_at:
 *           type: string
 *           format: date
 *           example: "2026-09-01"
 *     UpdateStudentInput:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 2
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         birth_date:
 *           type: string
 *           format: date
 *           example: "2008-05-20"
 *         gender:
 *           type: string
 *           enum: [Erkak, Ayol]
 *           example: "Erkak"
 *         address:
 *           type: string
 *           example: "Toshkent sh., Yunusobod tumani (Yangi manzil)"
 *         parent_name:
 *           type: string
 *           example: "Vali Valiyev"
 *         parent_phone:
 *           type: string
 *           example: "+998909998877"
 *         education:
 *           type: string
 *           example: "Litsey o'quvchisi"
 *         status:
 *           type: string
 *           enum: [active, inactive, graduated, dropped]
 *           example: "active"
 *         joined_at:
 *           type: string
 *           format: date
 *           example: "2026-09-01"
 */

/**
 * @swagger
 * /students:
 *   post:
 *     summary: Yangi o'quvchi qo'shish
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStudentInput'
 *     responses:
 *       201:
 *         description: O'quvchi muvaffaqiyatli qo'shildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: User yoki Branch topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/students", studentController.createStudent);

/**
 * @swagger
 * /students/search:
 *   get:
 *     summary: O'quvchilarni qidirish (Ota-onasi ismi, tel, manzil, ta'limi yoki statusi bo'yicha)
 *     tags: [Students]
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
 *                 $ref: '#/components/schemas/Student'
 *       400:
 *         description: Qidiruv parametri kiritilmagan
 *       500:
 *         description: Server xatosi
 */
router.get("/students/search", studentController.searchStudent);

/**
 * @swagger
 * /students:
 *   get:
 *     summary: Barcha o'quvchilar ro'yxatini olish
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: O'quvchilar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Student'
 *       500:
 *         description: Server xatosi
 */
router.get("/students", studentController.getStudent);

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     summary: ID bo'yicha bitta o'quvchini olish
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'quvchi ID si
 *     responses:
 *       200:
 *         description: O'quvchi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       404:
 *         description: O'quvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/students/:id", studentController.getStudentById);

/**
 * @swagger
 * /students/{id}:
 *   put:
 *     summary: ID bo'yicha o'quvchi ma'lumotlarini yangilash
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'quvchi ID si
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStudentInput'
 *     responses:
 *       200:
 *         description: O'quvchi ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: O'quvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/students/:id", studentController.updateStudent);

/**
 * @swagger
 * /students/{id}:
 *   delete:
 *     summary: ID bo'yicha o'quvchini o'chirish
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'quvchi ID si
 *     responses:
 *       200:
 *         description: O'quvchi muvaffaqiyatli o'chirildi
 *       404:
 *         description: O'quvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
const { authenticate } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

router.delete("/students/:id", authenticate, authorize('ADMIN'), studentController.deleteStudent);

module.exports = router;
