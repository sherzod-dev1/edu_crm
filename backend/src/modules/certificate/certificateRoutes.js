const express = require("express");
const router = express.Router();
const certificateController = require("./certificateController");

/**
 * @swagger
 * tags:
 *   name: Certificates
 *   description: Sertifikatlarni berish va verifikatsiya qilish bo'yicha API lar
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Certificate:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         student_id:
 *           type: integer
 *           example: 1
 *         course_id:
 *           type: integer
 *           example: 1
 *         certificate_number:
 *           type: string
 *           example: "CERT-202610-8472"
 *         title:
 *           type: string
 *           example: "Node.js Backend Dasturlash bo'yicha Bitiruv Sertifikati"
 *         issue_date:
 *           type: string
 *           format: date
 *           example: "2026-10-20"
 *         expiry_date:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: null
 *         file_url:
 *           type: string
 *           example: "https://edu-crm.uz/certificates/CERT-202610-8472.pdf"
 *         verification_code:
 *           type: string
 *           example: "VER-9A8B7C"
 *         status:
 *           type: string
 *           enum: [active, revoked, expired]
 *           example: "active"
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
 *     CertificateInput:
 *       type: object
 *       required:
 *         - student_id
 *         - course_id
 *         - title
 *       properties:
 *         student_id:
 *           type: integer
 *           example: 1
 *         course_id:
 *           type: integer
 *           example: 1
 *         certificate_number:
 *           type: string
 *           example: "CERT-202610-8472"
 *         title:
 *           type: string
 *           example: "Node.js Backend Dasturlash bo'yicha Bitiruv Sertifikati"
 *         issue_date:
 *           type: string
 *           format: date
 *           example: "2026-10-20"
 *         expiry_date:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: null
 *         file_url:
 *           type: string
 *           example: "https://edu-crm.uz/certificates/CERT-202610-8472.pdf"
 *         verification_code:
 *           type: string
 *           example: "VER-9A8B7C"
 *         status:
 *           type: string
 *           enum: [active, revoked, expired]
 *           example: "active"
 *         created_by:
 *           type: integer
 *           nullable: true
 *           example: 1
 */

/**
 * @swagger
 * /certificates:
 *   post:
 *     summary: Yangi sertifikat berish
 *     tags: [Certificates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CertificateInput'
 *     responses:
 *       201:
 *         description: Sertifikat muvaffaqiyatli berildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certificate'
 *       400:
 *         description: Noto'g'ri so'rov yoki validatsiya xatosi
 *       404:
 *         description: Talaba, kurs yoki foydalanuvchi topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/certificates", certificateController.createCertificate);

/**
 * @swagger
 * /certificates:
 *   get:
 *     summary: Barcha sertifikatlar ro'yxatini olish
 *     tags: [Certificates]
 *     responses:
 *       200:
 *         description: Sertifikatlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Certificate'
 *       500:
 *         description: Server xatosi
 */
router.get("/certificates", certificateController.getCertificate);

/**
 * @swagger
 * /certificates/search:
 *   get:
 *     summary: Sertifikatlarni qidirish
 *     tags: [Certificates]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Qidiruv kalit so'zi (certificate_number, verification_code, title, status)
 *     responses:
 *       200:
 *         description: Qidiruv natijalariga mos kelgan sertifikatlar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Certificate'
 *       400:
 *         description: Qidiruv so'zi kiritilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/certificates/search", certificateController.searchCertificate);

/**
 * @swagger
 * /certificates/verify/{code}:
 *   get:
 *     summary: Sertifikatni verifikatsiya kodi yoki raqami orqali tekshirish (QR-kod uchun)
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Sertifikat raqami yoki verifikatsiya kodi
 *     responses:
 *       200:
 *         description: Sertifikat haqiqiy va tasdiqlandi
 *       404:
 *         description: Sertifikat topilmadi yoki yaroqsiz
 *       500:
 *         description: Server xatosi
 */
router.get("/certificates/verify/:code", certificateController.verifyCertificate);

/**
 * @swagger
 * /certificates/{id}:
 *   get:
 *     summary: ID bo'yicha bitta sertifikatni olish
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sertifikat ID si
 *     responses:
 *       200:
 *         description: Sertifikat ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certificate'
 *       404:
 *         description: Certificate topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/certificates/:id", certificateController.getCertificateById);

/**
 * @swagger
 * /certificates/{id}:
 *   put:
 *     summary: Sertifikat ma'lumotlarini yangilash
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yangilanayotgan sertifikat ID si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CertificateInput'
 *     responses:
 *       200:
 *         description: Sertifikat muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certificate'
 *       400:
 *         description: Noto'g'ri ma'lumotlar kiritildi
 *       404:
 *         description: Sertifikat, talaba yoki kurs topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/certificates/:id", certificateController.updateCertificate);

/**
 * @swagger
 * /certificates/{id}:
 *   delete:
 *     summary: Sertifikatni o'chirish
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O'chirilayotgan sertifikat ID si
 *     responses:
 *       200:
 *         description: Sertifikat muvaffaqiyatli o'chirildi
 *       404:
 *         description: Certificate topilmadi
 *       500:
 *         description: Server xatosi
 */
router.delete("/certificates/:id", certificateController.deleteCertificate);

module.exports = router;
