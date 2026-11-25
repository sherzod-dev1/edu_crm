const { Op } = require('sequelize');
const { Payment, Student, PaymentMethod, User, Invoice, Course, Group } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class PaymentService {
  /**
   * 1. Yangi to'lov yaratish
   */
  async create(data) {
    if (data.student_id) {
      const student = await Student.findByPk(data.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (data.payment_method_id) {
      const paymentMethod = await PaymentMethod.findByPk(data.payment_method_id);
      if (!paymentMethod) {
        throw new Error("Belgilangan payment_method_id ga ega to'lov usuli topilmadi");
      }
    }

    if (data.created_by) {
      const user = await User.findByPk(data.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    const payment = await Payment.create(data);
    return payment;
  }

  /**
   * 2. Barcha to'lovlarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, student_id, payment_method_id, invoice_id } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (student_id) where.student_id = student_id;
    if (payment_method_id) where.payment_method_id = payment_method_id;
    if (invoice_id) where.invoice_id = invoice_id;

    if (search) {
      where[Op.or] = [
        { transaction_id: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } },
        { note: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Payment.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status", "course_id", "group_id", "branch_id"],
          include: [
            User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "branch_id"] } : null,
            Course ? { model: Course, as: "course", attributes: ["id", "name", "price"] } : null,
            Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
          ].filter(Boolean)
        } : null,
        PaymentMethod ? { model: PaymentMethod, as: "payment_method", attributes: ["id", "name", "code"] } : null,
        Invoice ? { model: Invoice, as: "invoice", attributes: ["id", "amount", "status"] } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha to'lovni olish
   */
  async getById(id) {
    const payment = await Payment.findByPk(id, {
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status", "course_id", "group_id", "branch_id"],
          include: [
            User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "branch_id"] } : null,
            Course ? { model: Course, as: "course", attributes: ["id", "name", "price"] } : null,
            Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
          ].filter(Boolean)
        } : null,
        PaymentMethod ? { model: PaymentMethod, as: "payment_method", attributes: ["id", "name", "code"] } : null,
        Invoice ? { model: Invoice, as: "invoice", attributes: ["id", "amount", "status"] } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    if (!payment) {
      throw new Error("To'lov topilmadi");
    }

    return payment;
  }

  /**
   * 4. To'lov ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const payment = await Payment.findByPk(id);
    if (!payment) {
      throw new Error("To'lov topilmadi");
    }

    if (updateData.student_id) {
      const student = await Student.findByPk(updateData.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (updateData.payment_method_id) {
      const paymentMethod = await PaymentMethod.findByPk(updateData.payment_method_id);
      if (!paymentMethod) {
        throw new Error("Belgilangan payment_method_id ga ega to'lov usuli topilmadi");
      }
    }

    if (updateData.created_by) {
      const user = await User.findByPk(updateData.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    await payment.update(updateData);
    return payment;
  }

  /**
   * 5. To'lovni o'chirish
   */
  async delete(id) {
    const payment = await Payment.findByPk(id);
    if (!payment) {
      throw new Error("To'lov topilmadi");
    }

    await payment.destroy();
    return { message: "To'lov muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. To'lovlarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Payment.findAll({
      where: {
        [Op.or]: [
          { transaction_id: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } },
          { note: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
        } : null,
        PaymentMethod ? { model: PaymentMethod, as: "payment_method", attributes: ["id", "name", "code"] } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new PaymentService();
