# 🎓 Education CRM (EDU_CRM) Backend API

Professional, scalable Modular RESTful API for Educational Center Management System built with **Node.js, Express, PostgreSQL, Sequelize ORM, and express-validator**.

---

## 🚀 Ishga tushirish (Getting Started)

### 1. Talablar
- Node.js (v18+)
- PostgreSQL (v14+)

### 2. O'rnatish
```bash
npm install
```

### 3. `.env` faylini sozlash
`.env` faylidagi baza parametrlarini o'zingizning PostgreSQL ma'lumotlaringiz bilan to'g'rilang:
```env
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=edu_crm_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=super_secret_jwt_key_crm_2026
JWT_EXPIRES_IN=7d
```

### 4. Serverni ishga tushirish
```bash
# Development rejimida (Nodemon bilan)
npm run dev

# Production rejimida
npm start
```

---

## 📌 API Endpointlar Ro'yxati (`/api/v1`)

Barcha CRUD operatsiyalari Pagination (`?page=1&limit=10`), Search (`?search=...`) va Filtrlarni qo'llab-quvvatlaydi.

| Modul | Endpoint | Asosiy Vazifasi |
|---|---|---|
| **Users / Auth** | `/api/v1/users` | Ro'yxatdan o'tish (`/register`), Kirish (`/login`), Profil (`/profile`), CRUD |
| **Branches** | `/api/v1/branches` | O'quv markaz filiallari CRUD |
| **Employees** | `/api/v1/employees` | Xodimlar va oylik maoshlari CRUD |
| **Teachers** | `/api/v1/teachers` | O'qituvchilar va soatbay stavkalari CRUD |
| **Students** | `/api/v1/students` | Talabalar, ota-onalar kontaktlari va balans CRUD |
| **Courses** | `/api/v1/courses` | Kurslar va narxlar CRUD |
| **Course Modules** | `/api/v1/course-modules` | Kurs modullari / rejasi CRUD |
| **Classrooms** | `/api/v1/classrooms` | Filialdagi xonalar va sig'imi CRUD |
| **Groups** | `/api/v1/groups` | O'quv guruhlari, dars kunlari va vaqtlari CRUD |
| **Group Students** | `/api/v1/group-students` | Talabalarni guruhga biriktirish CRUD |
| **Lessons** | `/api/v1/lessons` | Dars jadvali va darslar CRUD |
| **Attendances** | `/api/v1/attendances` | Davomat (bor/yo'q/sababli) CRUD |
| **Payment Methods**| `/api/v1/payment-methods`| To'lov turlari (Naqd, Karta, Click, Payme) CRUD |
| **Invoices** | `/api/v1/invoices` | Oylik to'lov talabnomalari CRUD |
| **Payments** | `/api/v1/payments` | Talabalar to'lovlari va kvitansiyalar CRUD |
| **Exams** | `/api/v1/exams` | Imtihonlar ro'yxati CRUD |
| **Exam Results** | `/api/v1/exam-results` | Imtihon natijalari va ballar CRUD |
| **Certificates** | `/api/v1/certificates` | Bitiruvchilar sertifikatlari CRUD |
| **Notifications** | `/api/v1/notifications` | Foydalanuvchilarga xabarnomalar CRUD |
| **Leads** | `/api/v1/leads` | CRM murojaatlar va lidlar CRUD |
| **Trial Lessons** | `/api/v1/trial-lessons` | Sinov darslari ro'yxati CRUD |
| **Activities** | `/api/v1/activities` | Audit log va tizim amallari CRUD |

---

## 🔒 Xavfsizlik va Arxitektura
- **JWT Authentication** (`Bearer <token>`)
- **Role-based Access Control** (`ADMIN`, `MANAGER`, `TEACHER`, `STUDENT`, `STAFF`)
- **Bcrypt password hashing**
- **express-validator** orqali kiruvchi ma'lumotlarni qat'iy tekshirish
- **Global Error Handling & Standard Response format**
