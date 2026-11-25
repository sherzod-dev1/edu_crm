const express = require("express");
const router = express.Router();
const attendanceController = require("./attendanceController");

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Darslardagi talabalar davomatini boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         lesson_id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         status:
 *           type: string
 *           enum: [present, absent, late, excused]
 *           example: "present"
 *         note:
 *           type: string
 *           example: "Darsga o'z vaqtida keldi va faol qatnashdi"
 *         marked_by:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         marked_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     AttendanceInput:
 *       type: object
 *       required:
 *         - lesson_id
 *         - student_id
 *       properties:
 *         lesson_id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         status:
 *           type: string
 *           enum: [present, absent, late, excused]
 *           example: "present"
 *         note:
 *           type: string
 *           example: "Darsga o'z vaqtida keldi va faol qatnashdi"
 *         marked_by:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         marked_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /attendances:
 *   post:
 *     summary: Yangi davomat yozuvini yaratish
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttendanceInput'
 *     responses:
 *       201:
 *         description: Davomat muvaffaqiyatli saqlandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Dars, talaba yoki foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/attendances", attendanceController.createAttendance);

/**
 * @swagger
 * /attendances:
 *   get:
 *     summary: Barcha davomatlar ro'yxatini olish
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Davomatlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 *       500:
 *         description: Server xatosi
 */
router.get("/attendances", attendanceController.getAttendance);
router.get("/attendances/live-monitor", attendanceController.getLiveMonitor);

/**
 * @swagger
 * /attendances/search:
 *   get:
 *     summary: Davomatlarni qidirish
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (status, note bo'yicha)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan davomatlar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/attendances/search", attendanceController.searchAttendance);

/**
 * @swagger
 * /attendances/{id}:
 *   get:
 *     summary: ID bo'yicha bitta davomat yozuvini olish
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Davomat ID si
 *     responses:
 *       200:
 *         description: Davomat ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 *       404:
 *         description: Davomat topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/attendances/:id", attendanceController.getAttendanceById);

/**
 * @swagger
 * /attendances/{id}:
 *   put:
 *     summary: Davomat ma'lumotlarini yangilash
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan davomat ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttendanceInput'
 *     responses:
 *       200:
 *         description: Davomat ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Davomat, dars, talaba yoki foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/attendances/:id", attendanceController.updateAttendance);

/**
 * @swagger
 * /attendances/{id}:
 *   delete:
 *     summary: Davomat yozuvini o'chirish
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan davomat ID si
 *     responses:
 *       200:
 *         description: Davomat yozuvi muvaffaqiyatli o'chirildi
 *       404:
 *         description: Davomat topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/attendances/:id", attendanceController.deleteAttendance);

module.exports = router;
