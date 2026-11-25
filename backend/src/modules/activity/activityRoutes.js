const express = require("express");
const router = express.Router();
const activityController = require("./activityController");

/**
 * @swagger
 * tags:
 *   name: Activities
 *   description: Tizim foydalanuvchilarining harakatlari va loglarini yuritish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Activity:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         action:
 *           type: string
 *           example: "CREATE_STUDENT"
 *         entity_type:
 *           type: string
 *           nullable: true
 *           example: "Student"
 *         entity_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Yangi talaba Ali Valiyev tizimga qo'shildi"
 *         ip_address:
 *           type: string
 *           nullable: true
 *           example: "127.0.0.1"
 *         created_at:
 *           type: string
 *           format: date-time
 *     ActivityInput:
 *       type: object
 *       required:
 *         - action
 *       properties:
 *         user_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         action:
 *           type: string
 *           example: "CREATE_STUDENT"
 *         entity_type:
 *           type: string
 *           nullable: true
 *           example: "Student"
 *         entity_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Yangi talaba Ali Valiyev tizimga qo'shildi"
 *         ip_address:
 *           type: string
 *           nullable: true
 *           example: "127.0.0.1"
 */

/**
 * @swagger
 * /activities:
 *   post:
 *     summary: Yangi faollik (Activity log) yaratish
 *     tags: [Activities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityInput'
 *     responses:
 *       201:
 *         description: Faollik muvaffaqiyatli saqlandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Activity'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/activities", activityController.createActivity);

/**
 * @swagger
 * /activities:
 *   get:
 *     summary: Barcha faolliklar ro'yxatini olish
 *     tags: [Activities]
 *     responses:
 *       200:
 *         description: Faolliklar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Activity'
 *       500:
 *         description: Server xatosi
 */
router.get("/activities", activityController.getActivity);

/**
 * @swagger
 * /activities/search:
 *   get:
 *     summary: Faolliklarni qidirish
 *     tags: [Activities]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (action, entity_type, description, ip_address)
 *     responses:
 *       200:
 *         description: Qidiruv natijalari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Activity'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/activities/search", activityController.searchActivity);

/**
 * @swagger
 * /activities/user/{userId}:
 *   get:
 *     summary: Foydalanuvchining barcha faolliklarini olish
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Foydalanuvchi ID si
 *     responses:
 *       200:
 *         description: Foydalanuvchi faolliklari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Activity'
 *       404:
 *         description: Foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/activities/user/:userId", activityController.getUserActivities);

/**
 * @swagger
 * /activities/entity/{type}/{id}:
 *   get:
 *     summary: Muayyan obyekt bo'yicha faolliklar tarixini olish (e.g. Student 1)
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Obyekt turi (Student, Payment, Group, Course, Lead)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Obyekt ID si
 *     responses:
 *       200:
 *         description: Obyekt bo'yicha barcha faolliklar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Activity'
 *       500:
 *         description: Server xatosi
 */
router.get("/activities/entity/:type/:id", activityController.getEntityActivities);

/**
 * @swagger
 * /activities/{id}:
 *   get:
 *     summary: ID bo'yicha bitta faollikni olish
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Faollik ID si
 *     responses:
 *       200:
 *         description: Faollik ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Activity'
 *       404:
 *         description: Activity topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/activities/:id", activityController.getActivityById);

/**
 * @swagger
 * /activities/{id}:
 *   put:
 *     summary: Faollik ma'lumotlarini yangilash
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan faollik ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityInput'
 *     responses:
 *       200:
 *         description: Faollik muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Activity'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Activity topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/activities/:id", activityController.updateActivity);

/**
 * @swagger
 * /activities/{id}:
 *   delete:
 *     summary: Faollikni o'chirish
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan faollik ID si
 *     responses:
 *       200:
 *         description: Faollik muvaffaqiyatli o'chirildi
 *       404:
 *         description: Activity topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/activities/:id", activityController.deleteActivity);

module.exports = router;
