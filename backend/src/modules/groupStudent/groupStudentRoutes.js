const express = require("express");
const router = express.Router();
const groupStudentController = require("./groupStudentController");

/**
 * @swagger
 * tags:
 *   name: GroupStudents
 *   description: Guruhdagi talabalarni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GroupStudent:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         group_id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         joined_at:
 *           type: string
 *           format: date
 *           example: "2026-10-01"
 *         left_at:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: null
 *         status:
 *           type: string
 *           enum: [active, left, frozen, graduated, inactive]
 *           example: "active"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     GroupStudentInput:
 *       type: object
 *       required:
 *         - group_id
 *         - student_id
 *       properties:
 *         group_id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         joined_at:
 *           type: string
 *           format: date
 *           example: "2026-10-01"
 *         left_at:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: null
 *         status:
 *           type: string
 *           enum: [active, left, frozen, graduated, inactive]
 *           example: "active"
 */

/**
 * @swagger
 * /group-students:
 *   post:
 *     summary: Guruhga yangi talaba biriktirish
 *     tags: [GroupStudents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupStudentInput'
 *     responses:
 *       201:
 *         description: Talaba guruhga muvaffaqiyatli biriktirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupStudent'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Guruh yoki talaba topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/group-students", groupStudentController.createGroupStudent);

/**
 * @swagger
 * /group-students:
 *   get:
 *     summary: Barcha guruh talabalari ro'yxatini olish
 *     tags: [GroupStudents]
 *     responses:
 *       200:
 *         description: Guruh talabalari ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GroupStudent'
 *       500:
 *         description: Server xatosi
 */
router.get("/group-students", groupStudentController.getGroupStudent);

/**
 * @swagger
 * /group-students/search:
 *   get:
 *     summary: Guruh talabalarini qidirish
 *     tags: [GroupStudents]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (status)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos yozuvlar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GroupStudent'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/group-students/search", groupStudentController.searchGroupStudent);

/**
 * @swagger
 * /group-students/{id}:
 *   get:
 *     summary: ID bo'yicha guruh talabasi yozuvini olish
 *     tags: [GroupStudents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yozuv ID si
 *     responses:
 *       200:
 *         description: Guruh talabasi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupStudent'
 *       404:
 *         description: GroupStudent topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/group-students/:id", groupStudentController.getGroupStudentById);

/**
 * @swagger
 * /group-students/{id}:
 *   put:
 *     summary: Guruh talabasi ma'lumotlarini yangilash
 *     tags: [GroupStudents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan yozuv ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupStudentInput'
 *     responses:
 *       200:
 *         description: Ma'lumotlar muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupStudent'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Yozuv, guruh yoki talaba topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/group-students/:id", groupStudentController.updateGroupStudent);

/**
 * @swagger
 * /group-students/{id}:
 *   delete:
 *     summary: Talabani guruhdan o'chirish
 *     tags: [GroupStudents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan yozuv ID si
 *     responses:
 *       200:
 *         description: Talaba guruhdan muvaffaqiyatli o'chirildi
 *       404:
 *         description: GroupStudent topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/group-students/:id", groupStudentController.deleteGroupStudent);

module.exports = router;
