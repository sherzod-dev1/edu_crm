const express = require("express");
const router = express.Router();
const classroomController = require("./classroomController");

/**
 * @swagger
 * tags:
 *   name: Classrooms
 *   description: O'quv xonalari (auditoriyalar)ni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Classroom:
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
 *           example: "Lab-302"
 *         floor:
 *           type: integer
 *           example: 3
 *         capacity:
 *           type: integer
 *           example: 24
 *         room_type:
 *           type: string
 *           example: "computer_lab"
 *         equipment:
 *           type: string
 *           example: "24 ta kompyuter, proyektor, konditsioner"
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *           example: "active"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ClassroomInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         name:
 *           type: string
 *           example: "Lab-302"
 *         floor:
 *           type: integer
 *           example: 3
 *         capacity:
 *           type: integer
 *           example: 24
 *         room_type:
 *           type: string
 *           example: "computer_lab"
 *         equipment:
 *           type: string
 *           example: "24 ta kompyuter, proyektor, konditsioner"
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *           example: "active"
 */

/**
 * @swagger
 * /classrooms:
 *   post:
 *     summary: Yangi xona yaratish
 *     tags: [Classrooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClassroomInput'
 *     responses:
 *       201:
 *         description: Xona muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Classroom'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Belgilangan branch_id ga ega filial topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/classrooms", classroomController.createClassroom);

/**
 * @swagger
 * /classrooms:
 *   get:
 *     summary: Barcha xonalar ro'yxatini olish
 *     tags: [Classrooms]
 *     responses:
 *       200:
 *         description: Xonalar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Classroom'
 *       500:
 *         description: Server xatosi
 */
router.get("/classrooms", classroomController.getClassroom);

/**
 * @swagger
 * /classrooms/search:
 *   get:
 *     summary: Xonalarni qidirish
 *     tags: [Classrooms]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (name, room_type, status, equipment)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan xonalar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Classroom'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/classrooms/search", classroomController.searchClassroom);

/**
 * @swagger
 * /classrooms/{id}:
 *   get:
 *     summary: ID bo'yicha bitta xonani olish
 *     tags: [Classrooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Xonaning ID si
 *     responses:
 *       200:
 *         description: Xona ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Classroom'
 *       404:
 *         description: Classroom topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/classrooms/:id", classroomController.getClassroomById);

/**
 * @swagger
 * /classrooms/{id}:
 *   put:
 *     summary: Xona ma'lumotlarini yangilash
 *     tags: [Classrooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan xonaning ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClassroomInput'
 *     responses:
 *       200:
 *         description: Xona muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Classroom'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Classroom yoki filial topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/classrooms/:id", classroomController.updateClassroom);

/**
 * @swagger
 * /classrooms/{id}:
 *   delete:
 *     summary: Xonani o'chirish
 *     tags: [Classrooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan xonaning ID si
 *     responses:
 *       200:
 *         description: Xona muvaffaqiyatli o'chirildi
 *       404:
 *         description: Classroom topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/classrooms/:id", classroomController.deleteClassroom);

module.exports = router;
