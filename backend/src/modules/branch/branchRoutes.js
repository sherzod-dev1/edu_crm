const express = require("express");
const router = express.Router();
const branchController = require("./branchController");

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Filiallarni boshqarish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Branch:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Chilonzor filiali"
 *         address:
 *           type: string
 *           example: "Toshkent sh., Chilonzor tumani, 9-mavze"
 *         phone:
 *           type: string
 *           example: "+998712001122"
 *         email:
 *           type: string
 *           example: "chilonzor@crm.uz"
 *         manager_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         status:
 *           type: string
 *           example: "active"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateBranchInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Chilonzor filiali"
 *         address:
 *           type: string
 *           example: "Toshkent sh., Chilonzor tumani, 9-mavze"
 *         phone:
 *           type: string
 *           example: "+998712001122"
 *         email:
 *           type: string
 *           example: "chilonzor@crm.uz"
 *         manager_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "active"
 *     UpdateBranchInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Chilonzor filiali (Yangilangan)"
 *         address:
 *           type: string
 *           example: "Toshkent sh., Chilonzor tumani, Yangi ko'cha 1"
 *         phone:
 *           type: string
 *           example: "+998712009988"
 *         email:
 *           type: string
 *           example: "chilonzor_new@crm.uz"
 *         manager_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "active"

 */

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Yangi filial yaratish
 *     tags: [Branches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBranchInput'
 *     responses:
 *       201:
 *         description: Filial muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Branch'
 *       400:
 *         description: Validatsiya xatosi
 *       500:
 *         description: Server xatosi
 */
router.post("/branches", branchController.createBranch);

/**
 * @swagger
 * /branches/search:
 *   get:
 *     summary: Filiallarni qidirish (Nomi, manzili, telefoni yoki emaili bo'yicha)
 *     tags: [Branches]
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
 *                 $ref: '#/components/schemas/Branch'
 *       400:
 *         description: Qidiruv parametri kiritilmagan
 *       500:
 *         description: Server xatosi
 */
router.get("/branches/search", branchController.searchBranch);

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: Barcha filiallar ro'yxatini olish
 *     tags: [Branches]
 *     responses:
 *       200:
 *         description: Filiallar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Branch'
 *       500:
 *         description: Server xatosi
 */
router.get("/branches", branchController.getBranch);

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: ID bo'yicha filialni olish
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Filial ID si
 *     responses:
 *       200:
 *         description: Filial ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Branch'
 *       404:
 *         description: Filial topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/branches/:id", branchController.getBranchById);

/**
 * @swagger
 * /branches/{id}:
 *   put:
 *     summary: ID bo'yicha filial ma'lumotlarini yangilash
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Filial ID si
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBranchInput'
 *     responses:
 *       200:
 *         description: Filial muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Branch'
 *       400:
 *         description: Validatsiya xatosi
 *       404:
 *         description: Filial topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/branches/:id", branchController.updateBranch);

/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     summary: ID bo'yicha filialni o'chirish
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Filial ID si
 *     responses:
 *       200:
 *         description: Filial muvaffaqiyatli o'chirildi
 *       404:
 *         description: Filial topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/branches/:id", branchController.deleteBranch);

module.exports = router;
