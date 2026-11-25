const express = require("express");
const router = express.Router();
const examResultController = require("./examResultController");

/**
 * @swagger
 * tags:
 *   name: ExamResults
 *   description: Imtihon natijalarini boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ExamResult:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         exam_id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         score:
 *           type: number
 *           format: float
 *           example: 88.50
 *         percentage:
 *           type: number
 *           format: float
 *           example: 88.50
 *         grade:
 *           type: string
 *           example: "B"
 *         passed:
 *           type: boolean
 *           example: true
 *         comment:
 *           type: string
 *           example: "Amaliy topshiriq a'lo darajada bajarildi"
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
 *     ExamResultInput:
 *       type: object
 *       required:
 *         - exam_id
 *         - student_id
 *         - score
 *       properties:
 *         exam_id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         score:
 *           type: number
 *           format: float
 *           example: 88.50
 *         percentage:
 *           type: number
 *           format: float
 *           example: 88.50
 *         grade:
 *           type: string
 *           example: "B"
 *         passed:
 *           type: boolean
 *           example: true
 *         comment:
 *           type: string
 *           example: "Amaliy topshiriq a'lo darajada bajarildi"
 *         created_by:
 *           type: integer
 *           nullable: true
 *           example: 1
 */

/**
 * @swagger
 * /exam-results:
 *   post:
 *     summary: Yangi imtihon natijasini kiritish
 *     tags: [ExamResults]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExamResultInput'
 *     responses:
 *       201:
 *         description: Natija muvaffaqiyatli saqlandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExamResult'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Imtihon, talaba yoki foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/exam-results", examResultController.createExamResult);

/**
 * @swagger
 * /exam-results:
 *   get:
 *     summary: Barcha imtihon natijalarini olish
 *     tags: [ExamResults]
 *     responses:
 *       200:
 *         description: Imtihon natijalari ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExamResult'
 *       500:
 *         description: Server xatosi
 */
router.get("/exam-results", examResultController.getExamResult);

/**
 * @swagger
 * /exam-results/search:
 *   get:
 *     summary: Imtihon natijalarini qidirish
 *     tags: [ExamResults]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (grade, comment bo'yicha)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan natijalar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExamResult'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/exam-results/search", examResultController.searchExamResult);

/**
 * @swagger
 * /exam-results/{id}:
 *   get:
 *     summary: ID bo'yicha bitta imtihon natijasini olish
 *     tags: [ExamResults]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Natija ID si
 *     responses:
 *       200:
 *         description: Imtihon natijasi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExamResult'
 *       404:
 *         description: ExamResult topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/exam-results/:id", examResultController.getExamResultById);

/**
 * @swagger
 * /exam-results/{id}:
 *   put:
 *     summary: Imtihon natijasini yangilash
 *     tags: [ExamResults]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan natija ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExamResultInput'
 *     responses:
 *       200:
 *         description: Imtihon natijasi muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExamResult'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: ExamResult, imtihon yoki talaba topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/exam-results/:id", examResultController.updateExamResult);

/**
 * @swagger
 * /exam-results/{id}:
 *   delete:
 *     summary: Imtihon natijasini o'chirish
 *     tags: [ExamResults]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan natija ID si
 *     responses:
 *       200:
 *         description: Imtihon natijasi muvaffaqiyatli o'chirildi
 *       404:
 *         description: ExamResult topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/exam-results/:id", examResultController.deleteExamResult);

module.exports = router;
