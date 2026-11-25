const { Op } = require('sequelize');
const { Lesson, Group, Teacher, Classroom, CourseModule, User, Course } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class LessonService {
  /**
   * 1. Yangi dars yaratish
   */
  async create(data) {
    if (data.group_id) {
      const group = await Group.findByPk(data.group_id);
      if (!group) {
        throw new Error("Belgilangan group_id ga ega guruh topilmadi");
      }
    }

    if (data.teacher_id) {
      const teacher = await Teacher.findByPk(data.teacher_id);
      if (!teacher) {
        throw new Error("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
      }
    }

    if (data.classroom_id) {
      const classroom = await Classroom.findByPk(data.classroom_id);
      if (!classroom) {
        throw new Error("Belgilangan classroom_id ga ega xona topilmadi");
      }
    }

    if (data.module_id) {
      const module = await CourseModule.findByPk(data.module_id);
      if (!module) {
        throw new Error("Belgilangan module_id ga ega modul topilmadi");
      }
    }

    const lesson = await Lesson.create(data);
    return lesson;
  }

  /**
   * 2. Barcha darslarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, group_id, teacher_id, classroom_id, module_id, lesson_date } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (group_id) where.group_id = group_id;
    if (teacher_id) where.teacher_id = teacher_id;
    if (classroom_id) where.classroom_id = classroom_id;
    if (module_id) where.module_id = module_id;
    if (lesson_date) where.lesson_date = lesson_date;

    if (search) {
      where[Op.or] = [
        { topic: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Lesson.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['lesson_date', 'DESC'], ['start_time', 'ASC']],
      include: [
        Group ? { 
          model: Group, 
          as: "group", 
          attributes: ["id", "name", "days", "start_time", "end_time", "branch_id", "classroom_id", "teacher_id"],
          include: [
            Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
            Teacher ? {
              model: Teacher,
              as: "teacher",
              attributes: ["id", "user_id", "specialization"],
              include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
            } : null
          ].filter(Boolean)
        } : null,
        Teacher ? { 
          model: Teacher, 
          as: "teacher", 
          attributes: ["id", "user_id", "specialization"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "floor", "room_type"] } : null,
        CourseModule ? { model: CourseModule, as: "module", attributes: ["id", "title", "order_number"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha darsni olish
   */
  async getById(id) {
    const lesson = await Lesson.findByPk(id, {
      include: [
        Group ? { 
          model: Group, 
          as: "group", 
          attributes: ["id", "name", "days", "start_time", "end_time", "branch_id", "classroom_id", "teacher_id"],
          include: [
            Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
            Teacher ? {
              model: Teacher,
              as: "teacher",
              attributes: ["id", "user_id", "specialization"],
              include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
            } : null
          ].filter(Boolean)
        } : null,
        Teacher ? { 
          model: Teacher, 
          as: "teacher", 
          attributes: ["id", "user_id", "specialization"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "floor", "room_type"] } : null,
        CourseModule ? { model: CourseModule, as: "module", attributes: ["id", "title", "order_number"] } : null
      ].filter(Boolean)
    });

    if (!lesson) {
      throw new Error("Dars topilmadi");
    }

    return lesson;
  }

  /**
   * 4. Dars ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const lesson = await Lesson.findByPk(id);
    if (!lesson) {
      throw new Error("Dars topilmadi");
    }

    if (updateData.group_id) {
      const group = await Group.findByPk(updateData.group_id);
      if (!group) {
        throw new Error("Belgilangan group_id ga ega guruh topilmadi");
      }
    }

    if (updateData.teacher_id) {
      const teacher = await Teacher.findByPk(updateData.teacher_id);
      if (!teacher) {
        throw new Error("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
      }
    }

    if (updateData.classroom_id) {
      const classroom = await Classroom.findByPk(updateData.classroom_id);
      if (!classroom) {
        throw new Error("Belgilangan classroom_id ga ega xona topilmadi");
      }
    }

    if (updateData.module_id) {
      const module = await CourseModule.findByPk(updateData.module_id);
      if (!module) {
        throw new Error("Belgilangan module_id ga ega modul topilmadi");
      }
    }

    await lesson.update(updateData);
    return lesson;
  }

  /**
   * 5. Darsni o'chirish
   */
  async delete(id) {
    const lesson = await Lesson.findByPk(id);
    if (!lesson) {
      throw new Error("Dars topilmadi");
    }

    await lesson.destroy();
    return { message: "Dars muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Darslarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Lesson.findAll({
      where: {
        [Op.or]: [
          { topic: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null,
        Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name"] } : null
      ].filter(Boolean),
      order: [['lesson_date', 'DESC']]
    });
  }
}

module.exports = new LessonService();
