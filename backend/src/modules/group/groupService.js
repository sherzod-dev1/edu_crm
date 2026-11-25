const { Op } = require('sequelize');
const { Group, Course, Teacher, Branch, User } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class GroupService {
  /**
   * 1. Yangi guruh yaratish
   */
  async create(data) {
    if (data.course_id) {
      const course = await Course.findByPk(data.course_id);
      if (!course) {
        throw new Error("Belgilangan course_id ga ega kurs topilmadi");
      }
    }

    if (data.teacher_id) {
      const teacher = await Teacher.findByPk(data.teacher_id);
      if (!teacher) {
        throw new Error("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
      }
    }

    if (data.branch_id) {
      const branch = await Branch.findByPk(data.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    const group = await Group.create(data);
    return group;
  }

  /**
   * 2. Barcha guruhlarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, course_id, teacher_id, branch_id } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (course_id) where.course_id = course_id;
    if (teacher_id) where.teacher_id = teacher_id;
    if (branch_id) where.branch_id = branch_id;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { days: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Group.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "price"] } : null,
        Teacher ? { 
          model: Teacher, 
          as: "teacher", 
          attributes: ["id", "specialization", "salary_type"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha guruhni olish
   */
  async getById(id) {
    const group = await Group.findByPk(id, {
      include: [
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "price"] } : null,
        Teacher ? { 
          model: Teacher, 
          as: "teacher", 
          attributes: ["id", "specialization", "salary_type"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null
      ].filter(Boolean)
    });

    if (!group) {
      throw new Error("Guruh topilmadi");
    }

    return group;
  }

  /**
   * 4. Guruh ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const group = await Group.findByPk(id);
    if (!group) {
      throw new Error("Guruh topilmadi");
    }

    if (updateData.course_id) {
      const course = await Course.findByPk(updateData.course_id);
      if (!course) {
        throw new Error("Belgilangan course_id ga ega kurs topilmadi");
      }
    }

    if (updateData.teacher_id) {
      const teacher = await Teacher.findByPk(updateData.teacher_id);
      if (!teacher) {
        throw new Error("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
      }
    }

    if (updateData.branch_id) {
      const branch = await Branch.findByPk(updateData.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    await group.update(updateData);
    return group;
  }

  /**
   * 5. Guruhni o'chirish
   */
  async delete(id) {
    const group = await Group.findByPk(id);
    if (!group) {
      throw new Error("Guruh topilmadi");
    }

    await group.destroy();
    return { message: "Guruh muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Guruhlarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Group.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { days: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new GroupService();
