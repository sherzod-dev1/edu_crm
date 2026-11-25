const bcrypt = require('bcryptjs');

/**
 * Initializes default system data (Branch, Admin User, Payment Methods, Classrooms)
 * if the database is newly created or empty.
 */
const initDefaultData = async (db) => {
  try {
    // 1. Initialize Default Branch
    let defaultBranch = null;
    if (db.Branch) {
      const branchCount = await db.Branch.count().catch(() => 0);
      if (branchCount === 0) {
        defaultBranch = await db.Branch.create({
          name: "Yuksalish Ta'limi (Bosh Filial)",
          address: "Toshkent shahri, Yunusobod tumani",
          phone: "+998712000000",
          email: "info@yuksalish.uz",
          status: "active",
          plan: "Premium",
          payment_type: "Oylik to'lov",
          max_students: 500,
        }).catch((err) => {
          console.warn('⚠️ Could not create default branch:', err.message);
          return null;
        });
        if (defaultBranch) {
          console.log('✅ Default branch initialized:', defaultBranch.name);
        }
      } else {
        defaultBranch = await db.Branch.findOne().catch(() => null);
      }
    }

    // 2. Initialize Default Super Admin User
    if (db.User) {
      const userCount = await db.User.count().catch(() => 0);
      if (userCount === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminUser = await db.User.create({
          full_name: "Bosh Administrator",
          phone: "+998901234567",
          email: "admin@gmail.com",
          hashed_password: hashedPassword,
          plain_password: "admin123",
          role: "SUPER_ADMIN",
          status: "active",
          branch_id: defaultBranch ? defaultBranch.id : null,
        }).catch((err) => {
          console.warn('⚠️ Could not create default admin user:', err.message);
          return null;
        });
        if (adminUser) {
          console.log('✅ Default super admin created: admin@gmail.com (Password: admin123)');
        }
      }
    }

    // 3. Initialize Default Payment Methods
    if (db.PaymentMethod) {
      const pmCount = await db.PaymentMethod.count().catch(() => 0);
      if (pmCount === 0) {
        const defaultMethods = [
          { name: "Naqd pul", code: "cash", description: "Filial kassasiga naqd to'lov", status: "active" },
          { name: "Plastik karta (Terminal)", code: "card", description: "Humo / UzCard orqali to'lov", status: "active" },
          { name: "Payme / Click", code: "online", description: "Mobil ilovalar orqali onlayn to'lov", status: "active" },
          { name: "Bank o'tkazmasi", code: "bank", description: "Bank hisob raqami orqali o'tkazma", status: "active" },
        ];
        for (const method of defaultMethods) {
          await db.PaymentMethod.create(method).catch(() => {});
        }
        console.log('✅ Default payment methods initialized (Naqd, Karta, Payme/Click, Bank).');
      }
    }

    // 4. Initialize Default Classrooms
    if (db.Classroom) {
      const roomCount = await db.Classroom.count().catch(() => 0);
      if (roomCount === 0 && defaultBranch) {
        const defaultRooms = [
          { name: "101-xona (IT Lab)", capacity: 20, branch_id: defaultBranch.id, status: "active" },
          { name: "102-xona (Ingliz tili)", capacity: 16, branch_id: defaultBranch.id, status: "active" },
          { name: "103-xona (Robototexnika)", capacity: 15, branch_id: defaultBranch.id, status: "active" },
        ];
        for (const room of defaultRooms) {
          await db.Classroom.create(room).catch(() => {});
        }
        console.log('✅ Default classrooms initialized (101, 102, 103).');
      }
    }
  } catch (err) {
    console.warn('⚠️ Database init error (continuing):', err.message);
  }
};

module.exports = { initDefaultData };

