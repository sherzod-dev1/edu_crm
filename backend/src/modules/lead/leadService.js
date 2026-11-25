const { Op } = require('sequelize');
const { Lead, Branch, User, Course } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class LeadService {
  /**
   * 1. Yangi lid yaratish
   */
  async create(data) {
    if (data.branch_id) {
      const branch = await Branch.findByPk(data.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    if (data.assigned_to) {
      const user = await User.findByPk(data.assigned_to);
      if (!user) {
        throw new Error("Belgilangan assigned_to ga ega foydalanuvchi topilmadi");
      }
    }

    if (data.interested_course_id) {
      const course = await Course.findByPk(data.interested_course_id);
      if (!course) {
        throw new Error("Belgilangan interested_course_id ga ega kurs topilmadi");
      }
    }

    const lead = await Lead.create(data);
    return lead;
  }

  /**
   * 2. Barcha lidlarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, branch_id, assigned_to, source, interested_course_id } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (branch_id) where.branch_id = branch_id;
    if (assigned_to) where.assigned_to = assigned_to;
    if (source) where.source = source;
    if (interested_course_id) where.interested_course_id = interested_course_id;

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { source: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Lead.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null,
        User ? { model: User, as: "assigned_user", attributes: ["id", "full_name", "phone", "email", "role"] } : null,
        Course ? { model: Course, as: "interested_course", attributes: ["id", "name", "slug", "price", "duration_months"] } : null,
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha bitta lidni olish
   */
  async getById(id) {
    const lead = await Lead.findByPk(id, {
      include: [
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address", "phone"] } : null,
        User ? { model: User, as: "assigned_user", attributes: ["id", "full_name", "phone", "email", "role"] } : null,
        Course ? { model: Course, as: "interested_course", attributes: ["id", "name", "slug", "price", "duration_months"] } : null,
      ].filter(Boolean)
    });

    if (!lead) {
      throw new Error("Lid topilmadi");
    }

    return lead;
  }

  /**
   * 4. Lid ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const lead = await Lead.findByPk(id);
    if (!lead) {
      throw new Error("Lid topilmadi");
    }

    if (updateData.branch_id) {
      const branch = await Branch.findByPk(updateData.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    if (updateData.assigned_to) {
      const user = await User.findByPk(updateData.assigned_to);
      if (!user) {
        throw new Error("Belgilangan assigned_to ga ega foydalanuvchi topilmadi");
      }
    }

    if (updateData.interested_course_id) {
      const course = await Course.findByPk(updateData.interested_course_id);
      if (!course) {
        throw new Error("Belgilangan interested_course_id ga ega kurs topilmadi");
      }
    }

    await lead.update(updateData);
    return lead;
  }

  /**
   * 5. Lidni konvertatsiya qilish
   */
  async convert(id) {
    const lead = await Lead.findByPk(id);
    if (!lead) {
      throw new Error("Lid topilmadi");
    }

    await lead.update({
      status: 'converted',
      converted_at: new Date()
    });

    return lead;
  }

  /**
   * 6. Lidni o'chirish
   */
  async delete(id) {
    const lead = await Lead.findByPk(id);
    if (!lead) {
      throw new Error("Lid topilmadi");
    }

    await lead.destroy();
    return { message: "Lid muvaffaqiyatli o'chirildi" };
  }

  /**
   * 7. Qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Lead.findAll({
      where: {
        [Op.or]: [
          { full_name: { [Op.iLike]: `%${query}%` } },
          { phone: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } },
          { source: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null,
        User ? { model: User, as: "assigned_user", attributes: ["id", "full_name"] } : null,
        Course ? { model: Course, as: "interested_course", attributes: ["id", "name"] } : null,
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new LeadService();
