const { Contract, User, Branch } = require("../../models");
const { validateContract } = require("./contractValidation");
const { Op } = require("sequelize");

// Avtomatik shartnoma raqami generatsiyasi
const generateContractNumber = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `EDU-SH-${year}-${randomNum}`;
};

// 1 oy qo'shish funksiyasi
const addOneMonth = (dateStr) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
};

// Shartnoma holati va qolgan kunlarni aniqlash yordamchi funksiyasi
const enrichContractData = (contract) => {
  if (!contract) return null;
  const data = typeof contract.toJSON === 'function' ? contract.toJSON() : { ...contract };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(data.end_date);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isExpired = daysLeft < 0;
  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 5;

  let computedStatus = data.status || 'active';
  if (isExpired) {
    computedStatus = 'expired';
  } else if (isExpiringSoon) {
    computedStatus = 'expiring_soon';
  }

  const starterPrice = 800000;
  const standardPrice = 1200000;
  const premiumPrice = 1800000;
  const resolvedPlan = (data.plan || 'Standart').trim();
  const planLower = resolvedPlan.toLowerCase();
  
  let price = standardPrice;
  let studentsRange = "601 - 1000";
  let maxStudents = 1000;

  if (planLower === 'starter') {
    price = starterPrice;
    studentsRange = "200 - 600";
    maxStudents = 600;
  } else if (planLower === 'premium') {
    price = premiumPrice;
    studentsRange = "1001 - 1800";
    maxStudents = 1800;
  }

  return {
    ...data,
    days_left: daysLeft,
    is_expiring_soon: isExpiringSoon,
    is_expired: isExpired,
    computed_status: computedStatus,
    price_per_month: price,
    formatted_amount: `${price.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`,
    students_range: studentsRange,
    max_students_limit: maxStudents,
    starter_price: starterPrice,
    standard_price: standardPrice,
    premium_price: premiumPrice,
  };
};

// 1. Yangi shartnoma tuzish (Super Admin -> Admin)
exports.createContract = async (req, res) => {
  const { error } = validateContract(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const payload = { ...req.body };

    // Admin mavjudligini tekshirish
    const adminUser = await User.findByPk(payload.admin_id);
    if (!adminUser) {
      return res.status(404).json({ message: "Tanlangan Administrator topilmadi" });
    }

    // Super Admin id sini belgilash (agar requestda kelgan bo'lsa yoki auth user)
    if (!payload.super_admin_id && req.user?.id) {
      payload.super_admin_id = req.user.id;
    }

    // Filial va markaz nomini avtomatik aniqlash
    if (!payload.branch_id && adminUser.branch_id) {
      payload.branch_id = adminUser.branch_id;
    }
    if (!payload.center_name) {
      if (payload.branch_id && Branch) {
        const br = await Branch.findByPk(payload.branch_id);
        payload.center_name = br?.name || adminUser.full_name;
      } else {
        payload.center_name = adminUser.full_name;
      }
    }

    // Plan va Oylik to'lov summasi (Starter: 800 000, Standart: 1 200 000, Premium: 1 800 000)
    let plan = 'Standart';
    if ((payload.plan || '').toLowerCase() === 'starter') plan = 'Starter';
    if ((payload.plan || '').toLowerCase() === 'premium') plan = 'Premium';
    payload.plan = plan;

    if (!payload.monthly_amount) {
      payload.monthly_amount = plan === 'Starter' ? 800000.00 : plan === 'Premium' ? 1800000.00 : 1200000.00;
    }

    // Shartnoma raqami
    if (!payload.contract_number) {
      payload.contract_number = generateContractNumber();
    }

    // Tugash sanasi (agar ko'rsatilmagan bo'lsa +1 oy)
    if (!payload.end_date) {
      payload.end_date = addOneMonth(payload.start_date);
    }

    if (!payload.status) payload.status = 'active';
    if (!payload.payment_status) payload.payment_status = 'paid';

    const contract = await Contract.create(payload);

    const createdContract = await Contract.findByPk(contract.id, {
      include: [
        User ? { model: User, as: "admin", attributes: ["id", "full_name", "email", "phone", "role"] } : null,
        User ? { model: User, as: "super_admin", attributes: ["id", "full_name", "email"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null
      ].filter(Boolean)
    });

    res.status(201).json(enrichContractData(createdContract));
  } catch (err) {
    console.error("Create contract error:", err);
    res.status(500).json({ message: err.message || "Shartnoma yaratishda xatolik" });
  }
};

// 2. Barcha shartnomalarni olish (Super Admin / Adminlar uchun ro'yxat)
exports.getContracts = async (req, res) => {
  try {
    const { plan, status, payment_status, search, admin_id } = req.query;
    const where = {};

    if (plan && plan !== 'ALL') {
      where.plan = plan;
    }
    if (payment_status && payment_status !== 'ALL') {
      where.payment_status = payment_status;
    }
    if (admin_id) {
      where.admin_id = admin_id;
    }
    if (search) {
      where[Op.or] = [
        { contract_number: { [Op.iLike]: `%${search}%` } },
        { center_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const contracts = await Contract.findAll({
      where,
      include: [
        User ? { model: User, as: "admin", attributes: ["id", "full_name", "email", "phone", "role"] } : null,
        User ? { model: User, as: "super_admin", attributes: ["id", "full_name", "email"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });

    const enriched = contracts.map(enrichContractData);

    // Status filter if requested
    let result = enriched;
    if (status && status !== 'ALL') {
      if (status === 'expiring_soon') {
        result = enriched.filter(c => c.is_expiring_soon);
      } else if (status === 'expired') {
        result = enriched.filter(c => c.is_expired);
      } else if (status === 'active') {
        result = enriched.filter(c => !c.is_expired && !c.is_expiring_soon);
      }
    }

    // Hisob-kitob statistikasi
    const totalCount = enriched.length;
    const activeCount = enriched.filter(c => !c.is_expired).length;
    const expiringSoonCount = enriched.filter(c => c.is_expiring_soon).length;
    const expiredCount = enriched.filter(c => c.is_expired).length;
    const totalMonthlyRevenue = enriched
      .filter(c => !c.is_expired)
      .reduce((sum, c) => sum + Number(c.monthly_amount || c.price_per_month || 0), 0);

    res.status(200).json({
      data: result,
      stats: {
        total: totalCount,
        active: activeCount,
        expiring_soon: expiringSoonCount,
        expired: expiredCount,
        total_monthly_revenue: totalMonthlyRevenue,
        starter_price: 800000,
        standard_price: 1200000,
        premium_price: 1800000
      }
    });
  } catch (err) {
    console.error("Get contracts error:", err);
    res.status(500).json({ message: err.message });
  }
};

// 3. ID bo'yicha shartnomani olish
exports.getContractById = async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id, {
      include: [
        User ? { model: User, as: "admin", attributes: ["id", "full_name", "email", "phone", "role"] } : null,
        User ? { model: User, as: "super_admin", attributes: ["id", "full_name", "email"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null
      ].filter(Boolean)
    });

    if (!contract) {
      return res.status(404).json({ message: "Shartnoma topilmadi" });
    }

    res.status(200).json(enrichContractData(contract));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Joriy tizimga kirgan Adminning faol shartnomasini olish (Eslatma Boxi va Profil uchun)
exports.getMyContract = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Foydalanuvchi aniqlanmadi" });
    }

    // Foydalanuvchini olish
    const user = await User.findByPk(userId, {
      include: [Branch ? { model: Branch, as: "branch" } : null].filter(Boolean)
    });

    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    // Super Admin bo'lsa umumiy shartnomalar xulosasini qaytarish
    const userRole = (user.role || '').toUpperCase();
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';

    if (isSuperAdmin) {
      return res.status(200).json({
        is_super_admin: true,
        message: "Super Admin uchun shartnoma cheklovi yo'q"
      });
    }

    // Admin uchun mavjud eng so'nggi shartnomani qidirish
    let contract = await Contract.findOne({
      where: {
        [Op.or]: [
          { admin_id: userId },
          ...(user.branch_id ? [{ branch_id: user.branch_id }] : [])
        ]
      },
      include: [
        User ? { model: User, as: "admin", attributes: ["id", "full_name", "email", "phone", "role"] } : null,
        User ? { model: User, as: "super_admin", attributes: ["id", "full_name", "email"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null
      ].filter(Boolean),
      order: [['end_date', 'DESC']]
    });

    // Agar shartnoma bazada mavjud bo'lmasa, ushbu admin uchun avtomatik boshlang'ich shartnoma shakllantirish
    if (!contract) {
      const today = new Date().toISOString().split('T')[0];
      const endDate = addOneMonth(today);
      const userPlan = user.branch?.plan || 'Standart';
      const monthlyAmount = userPlan === 'Starter' ? 800000.00 : userPlan === 'Premium' ? 1800000.00 : 1200000.00;

      // Super adminni topish
      const superAdmin = await User.findOne({
        where: { role: { [Op.in]: ['SUPER_ADMIN', 'SUPERADMIN'] } }
      });

      const newContract = await Contract.create({
        contract_number: generateContractNumber(),
        admin_id: user.id,
        super_admin_id: superAdmin?.id || null,
        branch_id: user.branch_id || null,
        center_name: user.branch?.name || user.full_name || "O'quv Markazi",
        plan: userPlan,
        monthly_amount: monthlyAmount,
        start_date: today,
        end_date: endDate,
        billing_cycle: "Oylik to'lov",
        status: 'active',
        payment_status: 'paid',
        auto_renew: true,
        terms: "EDU CRM platformasidan foydalanish bo'yicha oylik shartnoma"
      });

      contract = await Contract.findByPk(newContract.id, {
        include: [
          User ? { model: User, as: "admin", attributes: ["id", "full_name", "email", "phone", "role"] } : null,
          User ? { model: User, as: "super_admin", attributes: ["id", "full_name", "email"] } : null,
          Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null
        ].filter(Boolean)
      });
    }

    res.status(200).json(enrichContractData(contract));
  } catch (err) {
    console.error("Get my contract error:", err);
    res.status(500).json({ message: err.message });
  }
};

// 5. Shartnomani tahrirlash (Update)
exports.updateContract = async (req, res) => {
  const { error } = validateContract(req.body, true);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Shartnoma topilmadi" });
    }

    const payload = { ...req.body };

    // Agar plan o'zgarsa, monthly_amount ni ham moslashtirish (agar explicit kiritilmagan bo'lsa)
    if (payload.plan && !payload.monthly_amount) {
      payload.monthly_amount = payload.plan === 'Starter' ? 800000.00 : payload.plan === 'Premium' ? 1800000.00 : 1200000.00;
    }

    await contract.update(payload);

    const updated = await Contract.findByPk(contract.id, {
      include: [
        User ? { model: User, as: "admin", attributes: ["id", "full_name", "email", "phone", "role"] } : null,
        User ? { model: User, as: "super_admin", attributes: ["id", "full_name", "email"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null
      ].filter(Boolean)
    });

    res.status(200).json(enrichContractData(updated));
  } catch (err) {
    console.error("Update contract error:", err);
    res.status(500).json({ message: err.message });
  }
};

// 6. Shartnomani uzaytirish (Renew: +1 oy, +3 oy, etc.)
exports.renewContract = async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Shartnoma topilmadi" });
    }

    const { months = 1, payment_status = 'paid' } = req.body;

    // Yangi muddatni hisoblash
    const currentEndDate = new Date(contract.end_date);
    const today = new Date();
    
    // Agar allaqachon muddati tugagan bo'lsa, bugundan boshlab hisoblash
    const baseDate = currentEndDate > today ? currentEndDate : today;
    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + Number(months));

    const updatedStartDate = baseDate.toISOString().split('T')[0];
    const updatedEndDate = newEndDate.toISOString().split('T')[0];

    await contract.update({
      start_date: updatedStartDate,
      end_date: updatedEndDate,
      status: 'active',
      payment_status: payment_status,
      notes: `${contract.notes || ''}\n[${new Date().toLocaleDateString('uz-UZ')}] Shartnoma +${months} oyga uzaytirildi.`
    });

    const refreshed = await Contract.findByPk(contract.id, {
      include: [
        User ? { model: User, as: "admin", attributes: ["id", "full_name", "email", "phone", "role"] } : null,
        User ? { model: User, as: "super_admin", attributes: ["id", "full_name", "email"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null
      ].filter(Boolean)
    });

    res.status(200).json({
      message: `Shartnoma muvaffaqiyatli ${months} oyga uzaytirildi!`,
      data: enrichContractData(refreshed)
    });
  } catch (err) {
    console.error("Renew contract error:", err);
    res.status(500).json({ message: err.message });
  }
};

// 7. Shartnomani o'chirish
exports.deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Shartnoma topilmadi" });
    }

    const data = contract.toJSON();
    await contract.destroy();
    res.status(200).json({ success: true, message: "Shartnoma o'chirildi", data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
