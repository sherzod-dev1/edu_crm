const express = require("express");
const router = express.Router();
const userController = require("./userController");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Foydalanuvchilarni boshqarish va autentifikatsiya API lari
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         full_name:
 *           type: string
 *           example: "Ali Valiyev"
 *         phone:
 *           type: string
 *           example: "+998901234567"
 *         email:
 *           type: string
 *           example: "ali@example.com"
 *         role:
 *           type: string
 *           example: "ADMIN"
 *         status:
 *           type: string
 *           example: "active"
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/avatar.png"
 *         last_login_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateUserInput:
 *       type: object
 *       required:
 *         - full_name
 *         - phone
 *         - email
 *         - hashed_password
 *         - role
 *         - status
 *       properties:
 *         full_name:
 *           type: string
 *           example: "Ali Valiyev"
 *         phone:
 *           type: string
 *           example: "+998901234567"
 *         email:
 *           type: string
 *           example: "ali@example.com"
 *         hashed_password:
 *           type: string
 *           example: "password123"
 *         role:
 *           type: string
 *           enum: [ADMIN, MANAGER, TEACHER, STUDENT, STAFF]
 *           example: "ADMIN"
 *         status:
 *           type: string
 *           enum: [active, inactive, pending]
 *           example: "active"
 *         avatar:
 *           type: string
 *           example: "https://example.com/avatar.png"
 *     UpdateUserInput:
 *       type: object
 *       properties:
 *         full_name:
 *           type: string
 *           example: "Ali Valiyev Yangilangan"
 *         phone:
 *           type: string
 *           example: "+998901234567"
 *         email:
 *           type: string
 *           example: "ali_new@example.com"
 *         hashed_password:
 *           type: string
 *           example: "newpassword123"
 *         role:
 *           type: string
 *           example: "MANAGER"
 *         status:
 *           type: string
 *           example: "active"
 *         avatar:
 *           type: string
 *           example: "https://example.com/new_avatar.png"
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: "ali@example.com"
 *         password:
 *           type: string
 *           example: "password123"
 *     LoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "User successfully logged in"
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Yangi foydalanuvchi yaratish (Ro'yxatdan o'tkazish)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserInput'
 *     responses:
 *       201:
 *         description: Foydalanuvchi muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validatsiya xatosi
 *       500:
 *         description: Server xatosi
 */
router.post("/users", userController.createUser);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Foydalanuvchi tizimga kirishi (Login)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Email va parol kiritilmagan
 *       401:
 *         description: Noto'g'ri email yoki parol
 *       500:
 *         description: Server xatosi
 */
router.post("/users/login", userController.loginUser);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Foydalanuvchilarni qidirish (Ism, telefon yoki email bo'yicha)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidirilayotgan so'z (ism, tel yoki email)
 *     responses:
 *       200:
 *         description: Qidiruv natijalari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       400:
 *         description: Qidiruv parametri kiritilmagan
 *       500:
 *         description: Server xatosi
 */
router.get("/users/search", userController.searchUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Barcha foydalanuvchilar ro'yxatini olish
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Foydalanuvchilar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server xatosi
 */
router.get("/users", userController.getUser);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: ID bo'yicha bitta foydalanuvchini olish
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Foydalanuvchi ID si
 *     responses:
 *       200:
 *         description: Foydalanuvchi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/users/:id", userController.getUserById);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: ID bo'yicha foydalanuvchi ma'lumotlarini yangilash
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Foydalanuvchi ID si
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserInput'
 *     responses:
 *       200:
 *         description: Foydalanuvchi muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: Foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/users/:id", userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: ID bo'yicha foydalanuvchini o'chirish
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Foydalanuvchi ID si
 *     responses:
 *       200:
 *         description: Foydalanuvchi muvaffaqiyatli o'chirildi
 *       404:
 *         description: Foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/users/:id", userController.deleteUser);

module.exports = router;
