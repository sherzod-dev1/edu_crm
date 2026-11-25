const { Op } = require('sequelize');
const { CourseModule, Course } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class CourseModuleService {
  /**
   * 1. Yangi modul yaratish
   */
  async create(data) {
    if (data.course_id) {
      const course = await Course.findByPk(data.course_id);
      if (!course) {
        throw new Error("Belgilangan course_id ga ega kurs topilmadi");
      }
    }

    const courseModule = await CourseModule.create(data);
    return courseModule;
  }

  /**
   * 2. Barcha modullarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, course_id } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (course_id) where.course_id = course_id;

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await CourseModule.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['order_number', 'ASC'], ['created_at', 'DESC']],
      include: Course ? [{ model: Course, as: "course", attributes: ["id", "name", "slug"] }] : []
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha modulni olish
   */
  async getById(id) {
    const courseModule = await CourseModule.findByPk(id, {
      include: Course ? [{ model: Course, as: "course", attributes: ["id", "name", "slug"] }] : []
    });

    if (!courseModule) {
      throw new Error("Modul topilmadi");
    }

    return courseModule;
  }

  /**
   * 4. Modul ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const courseModule = await CourseModule.findByPk(id);
    if (!courseModule) {
      throw new Error("Modul topilmadi");
    }

    if (updateData.course_id) {
      const course = await Course.findByPk(updateData.course_id);
      if (!course) {
        throw new Error("Belgilangan course_id ga ega kurs topilmadi");
      }
    }

    await courseModule.update(updateData);
    return courseModule;
  }

  /**
   * 5. Modulni o'chirish
   */
  async delete(id) {
    const courseModule = await CourseModule.findByPk(id);
    if (!courseModule) {
      throw new Error("Modul topilmadi");
    }

    await courseModule.destroy();
    return { message: "Modul muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Modullarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await CourseModule.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: Course ? [{ model: Course, as: "course", attributes: ["id", "name", "slug"] }] : [],
      order: [['order_number', 'ASC']]
    });
  }
}

module.exports = new CourseModuleService();
