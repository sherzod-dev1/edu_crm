const { Op } = require('sequelize');
const { Exam, Course, Group, CourseModule, Teacher, User } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class ExamService {
  /**
   * 1. Yangi imtihon yaratish
   */
  async create(data) {
    if (data.course_id) {
      const course = await Course.findByPk(data.course_id);
      if (!course) {
        throw new Error("Belgilangan course_id ga ega kurs topilmadi");
      }
    }

    if (data.group_id) {
      const group = await Group.findByPk(data.group_id);
      if (!group) {
        throw new Error("Belgilangan group_id ga ega guruh topilmadi");
      }
    }

    if (data.module_id) {
      const module = await CourseModule.findByPk(data.module_id);
      if (!module) {
        throw new Error("Belgilangan module_id ga ega modul topilmadi");
      }
    }

    if (data.teacher_id) {
      const teacher = await Teacher.findByPk(data.teacher_id);
      if (!teacher) {
        throw new Error("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
      }
    }

    const exam = await Exam.create(data);
    return exam;
  }

  /**
   * 2. Barcha imtihonlarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, course_id, group_id, teacher_id, module_id, exam_date } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (course_id) where.course_id = course_id;
    if (group_id) where.group_id = group_id;
    if (teacher_id) where.teacher_id = teacher_id;
    if (module_id) where.module_id = module_id;
    if (exam_date) where.exam_date = exam_date;

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Exam.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['exam_date', 'DESC'], ['created_at', 'DESC']],
      include: [
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug"] } : null,
        Group ? { model: Group, as: "group", attributes: ["id", "name", "days"] } : null,
        CourseModule ? { model: CourseModule, as: "module", attributes: ["id", "title", "order_number"] } : null,
        Teacher ? { 
          model: Teacher, 
          as: "teacher", 
          attributes: ["id", "specialization"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha imtihonni olish
   */
  async getById(id) {
    const exam = await Exam.findByPk(id, {
      include: [
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug"] } : null,
        Group ? { model: Group, as: "group", attributes: ["id", "name", "days"] } : null,
        CourseModule ? { model: CourseModule, as: "module", attributes: ["id", "title", "order_number"] } : null,
        Teacher ? { 
          model: Teacher, 
          as: "teacher", 
          attributes: ["id", "specialization"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null
      ].filter(Boolean)
    });

    if (!exam) {
      throw new Error("Imtihon topilmadi");
    }

    return exam;
  }

  /**
   * 4. Imtihon ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const exam = await Exam.findByPk(id);
    if (!exam) {
      throw new Error("Imtihon topilmadi");
    }

    if (updateData.course_id) {
      const course = await Course.findByPk(updateData.course_id);
      if (!course) {
        throw new Error("Belgilangan course_id ga ega kurs topilmadi");
      }
    }

    if (updateData.group_id) {
      const group = await Group.findByPk(updateData.group_id);
      if (!group) {
        throw new Error("Belgilangan group_id ga ega guruh topilmadi");
      }
    }

    if (updateData.module_id) {
      const module = await CourseModule.findByPk(updateData.module_id);
      if (!module) {
        throw new Error("Belgilangan module_id ga ega modul topilmadi");
      }
    }

    if (updateData.teacher_id) {
      const teacher = await Teacher.findByPk(updateData.teacher_id);
      if (!teacher) {
        throw new Error("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
      }
    }

    await exam.update(updateData);
    return exam;
  }

  /**
   * 5. Imtihonni o'chirish
   */
  async delete(id) {
    const exam = await Exam.findByPk(id);
    if (!exam) {
      throw new Error("Imtihon topilmadi");
    }

    await exam.destroy();
    return { message: "Imtihon muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Imtihonlarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Exam.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
        Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
      ].filter(Boolean),
      order: [['exam_date', 'DESC']]
    });
  }
}

module.exports = new ExamService();
