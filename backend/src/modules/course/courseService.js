const { Op } = require('sequelize');
const { Course, Branch, Teacher, User } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

// Slug generatsiya qiluvchi yordamchi funksiya
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);
};

class CourseService {
  /**
   * 1. Yangi kurs yaratish
   */
  async create(data) {
    if (data.branch_id) {
      const branch = await Branch.findByPk(data.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    const course = await Course.create(data);
    return course;
  }

  /**
   * 2. Barcha kurslarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, branch_id, level } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (branch_id) where.branch_id = branch_id;
    if (level) where.level = level;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { slug: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { level: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Course.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
        Teacher ? {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "specialization", "status", "branch_id"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "avatar"] }] : []
        } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha kursni olish
   */
  async getById(id) {
    const course = await Course.findByPk(id, {
      include: [
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
        Teacher ? {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "specialization", "status", "branch_id"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "avatar"] }] : []
        } : null
      ].filter(Boolean)
    });

    if (!course) {
      throw new Error("Kurs topilmadi");
    }

    return course;
  }

  /**
   * 4. Kurs ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const course = await Course.findByPk(id);
    if (!course) {
      throw new Error("Kurs topilmadi");
    }

    if (updateData.branch_id) {
      const branch = await Branch.findByPk(updateData.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    if (updateData.name && !updateData.slug) {
      updateData.slug = generateSlug(updateData.name);
    }

    await course.update(updateData);
    return course;
  }

  /**
   * 5. Kursni o'chirish
   */
  async delete(id) {
    const course = await Course.findByPk(id);
    if (!course) {
      throw new Error("Kurs topilmadi");
    }

    await course.destroy();
    return { message: "Kurs muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Kurslarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Course.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { slug: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { level: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: Branch ? [{ model: Branch, as: "branch", attributes: ["id", "name"] }] : []
    });
  }
}

module.exports = new CourseService();
