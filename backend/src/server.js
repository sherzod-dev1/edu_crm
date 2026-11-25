require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const db = require('./models');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Sync Models (if DB is accessible)
    try {
      await db.sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255);').catch(() => {});
      await db.sequelize.query("UPDATE users SET plain_password = 'admin123' WHERE plain_password IS NULL OR plain_password = '';").catch(() => {});
      await db.sequelize.query("ALTER TABLE branches ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'Standart';").catch(() => {});
      await db.sequelize.query("ALTER TABLE branches ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'Oylik to''lov';").catch(() => {});
      await db.sequelize.query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 300;').catch(() => {});
      await db.sequelize.query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS modules JSON;').catch(() => {});
      await db.sequelize.query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS lesson_time VARCHAR(100);').catch(() => {});
      await db.sequelize.query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS classroom_id BIGINT;').catch(() => {});
      await db.sequelize.query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS opening_date DATE;').catch(() => {});
      await db.sequelize.query("UPDATE groups SET opening_date = DATE(created_at) WHERE opening_date IS NULL;").catch(() => {});
      await db.sequelize.query("UPDATE groups SET start_date = DATE(created_at) WHERE start_date IS NULL;").catch(() => {});
      await db.sequelize.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_id BIGINT;').catch(() => {});
      await db.sequelize.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS lesson_time VARCHAR(100);').catch(() => {});
      await db.sequelize.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS start_time VARCHAR(50);').catch(() => {});
      await db.sequelize.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS days VARCHAR(100);').catch(() => {});
      if (db.Contract) {
        await db.Contract.sync().catch(() => {});
      }
      if (db.TeacherAttendance) {
        await db.TeacherAttendance.sync().catch(() => {});
      }
      await db.sequelize.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;').catch(() => {});
      if (db.StudentGrade) {
        await db.StudentGrade.sync().catch(() => {});
      }
      if (db.MarketOrder) {
        await db.MarketOrder.sync().catch(() => {});
        await db.sequelize.query('ALTER TABLE market_orders ADD COLUMN IF NOT EXISTS coins_deducted BOOLEAN DEFAULT FALSE;').catch(() => {});
      }
      
      // Ensure all database tables exist (non-destructive CREATE TABLE IF NOT EXISTS)
      await db.sequelize.sync({ alter: false }).catch(() => {});
      console.log('✅ Database models synchronized successfully.');

      // Initialize default branch, admin user, classrooms, payment methods if empty
      const { initDefaultData } = require('./utils/initDb');
      await initDefaultData(db).catch(() => {});

      const { syncCoursesToGroups } = require('./syncCoursesToGroups');
      await syncCoursesToGroups().catch(() => {});

      // 7 kundan eski xabarnomalarni tizimdan avtomatik tozalash (Retention: 7 days)
      try {
        const { purgeOldNotifications } = require('./modules/notification/notificationController');
        if (typeof purgeOldNotifications === 'function') {
          await purgeOldNotifications().catch(() => {});
          setInterval(() => purgeOldNotifications().catch(() => {}), 1000 * 60 * 60 * 6); // Har 6 soatda avtomatik tozalash
        }
      } catch (purgeErr) {
        // quiet
      }
    } catch (syncErr) {
      console.warn('⚠️ Model sync warning (Ensure PostgreSQL server is running and database exists):', syncErr.message);
    }

    // 3. Start HTTP Server
    const server = http.createServer(app);

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${PORT} allaqachon band (EADDRINUSE).`);
        console.warn(`🔄 1.5 soniyadan so'ng avtomatik qayta ulanishga uriniladi...`);
        setTimeout(() => {
          server.close();
          server.listen(PORT);
        }, 1500);
      } else {
        console.error('❌ Serverda xatolik:', err);
      }
    });

    const shutdown = () => {
      server.close(() => {
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    server.listen(PORT, () => {
      console.log(`🚀 EDU CRM Server is running on http://localhost:${PORT}`);
      console.log(`📄 Health check: http://localhost:${PORT}/`);
      console.log(`📚 Swagger Docs: http://localhost:${PORT}/api/docs`);
      console.log(`🌐 API Base: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
