const express = require("express");
const router = express.Router();
const employeeController = require("./employeeController");
const { authenticate } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

// Xodimlarni boshqarish Admin, Super Admin va Buxgalter uchun ruxsat etilgan (Menejer taqiqlangan)
router.use('/employees', authenticate, authorize('ADMIN', 'ACCOUNTANT'));

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Xodimlarni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         position:
 *           type: string
 *           example: "Senior Administrator"
 *         salary:
 *           type: number
 *           example: 5000000.00
 *         hire_date:
 *           type: string
 *           format: date
 *           example: "2026-01-15"
 *         status:
 *           type: string
 *           example: "active"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateEmployeeInput:
 *       type: object
 *       required:
 *         - user_id
 *         - position
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 2
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: null

 *         position:
 *           type: string
 *           example: "Administrator"
 *         salary:
 *           type: number
 *           example: 4500000.00
 *         hire_date:
 *           type: string
 *           format: date
 *           example: "2026-09-01"
 *         status:
 *           type: string
 *           enum: [active, inactive, on_leave]
 *           example: "active"
 *     UpdateEmployeeInput:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 1
 *         branch_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         position:
 *           type: string
 *           example: "Bosh Administrator"
 *         salary:
 *           type: number
 *           example: 6000000.00
 *         hire_date:
 *           type: string
 *           format: date
 *           example: "2026-09-01"
 *         status:
 *           type: string
 *           enum: [active, inactive, on_leave]
 *           example: "active"
 */

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Yangi xodim qo'shish
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployeeInput'
 *     responses:
 *       201:
 *         description: Xodim muvaffaqiyatli qo'shildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: User yoki Branch topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/employees", employeeController.createEmployee);

/**
 * @swagger
 * /employees/search:
 *   get:
 *     summary: Xodimlarni qidirish (Lavozim yoki status bo'yicha)
 *     tags: [Employees]
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
 *                 $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Qidiruv parametri kiritilmagan
 *       500:
 *         description: Server xatosi
 */
router.get("/employees/search", employeeController.searchEmployee);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Barcha xodimlar ro'yxatini olish
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Xodimlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       500:
 *         description: Server xatosi
 */
router.get("/employees", employeeController.getEmployee);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: ID bo'yicha bitta xodimni olish
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Xodim ID si
 *     responses:
 *       200:
 *         description: Xodim ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Xodim topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/employees/:id", employeeController.getEmployeeById);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: ID bo'yicha xodim ma'lumotlarini yangilash
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Xodim ID si
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEmployeeInput'
 *     responses:
 *       200:
 *         description: Xodim ma'lumotlari muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: Xodim topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/employees/:id", employeeController.updateEmployee);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: ID bo'yicha xodimni o'chirish
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Xodim ID si
 *     responses:
 *       200:
 *         description: Xodim muvaffaqiyatli o'chirildi
 *       404:
 *         description: Xodim topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/employees/:id", employeeController.deleteEmployee);

module.exports = router;
