const { Op } = require('sequelize');
const { Invoice, Student, Group, User, Payment, Course } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

// Avtomatik invoice_number yaratish
const generateInvoiceNumber = () => {
  return 'INV-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000);
};

class InvoiceService {
  /**
   * 1. Yangi hisob-faktura yaratish
   */
  async create(data) {
    if (data.student_id) {
      const student = await Student.findByPk(data.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (data.group_id) {
      const group = await Group.findByPk(data.group_id);
      if (!group) {
        throw new Error("Belgilangan group_id ga ega guruh topilmadi");
      }
    }

    if (data.created_by) {
      const user = await User.findByPk(data.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    if (!data.invoice_number) {
      data.invoice_number = generateInvoiceNumber();
    }

    const paid = Number(data.paid_amount || 0);
    const total = Number(data.amount);
    if (data.due_amount === undefined || data.due_amount === null) {
      data.due_amount = Math.max(0, total - paid);
    }

    const invoice = await Invoice.create(data);
    return invoice;
  }

  /**
   * 2. Barcha hisob-fakturalarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, student_id, group_id } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (student_id) where.student_id = student_id;
    if (group_id) where.group_id = group_id;

    if (search) {
      where[Op.or] = [
        { invoice_number: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Invoice.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        Group ? { 
          model: Group, 
          as: "group", 
          attributes: ["id", "name", "days"],
          include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
        } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha hisob-fakturani olish
   */
  async getById(id) {
    const invoice = await Invoice.findByPk(id, {
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        Group ? { 
          model: Group, 
          as: "group", 
          attributes: ["id", "name", "days"],
          include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
        } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null,
        Payment ? { model: Payment, as: "payments", attributes: ["id", "amount", "status", "payment_date"] } : null
      ].filter(Boolean)
    });

    if (!invoice) {
      throw new Error("Hisob-faktura topilmadi");
    }

    return invoice;
  }

  /**
   * 4. Hisob-faktura ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new Error("Hisob-faktura topilmadi");
    }

    if (updateData.student_id) {
      const student = await Student.findByPk(updateData.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (updateData.group_id) {
      const group = await Group.findByPk(updateData.group_id);
      if (!group) {
        throw new Error("Belgilangan group_id ga ega guruh topilmadi");
      }
    }

    if (updateData.created_by) {
      const user = await User.findByPk(updateData.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    await invoice.update(updateData);
    return invoice;
  }

  /**
   * 5. Hisob-fakturani o'chirish
   */
  async delete(id) {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new Error("Hisob-faktura topilmadi");
    }

    await invoice.destroy();
    return { message: "Hisob-faktura muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Hisob-fakturalarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Invoice.findAll({
      where: {
        [Op.or]: [
          { invoice_number: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
        } : null,
        Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new InvoiceService();
