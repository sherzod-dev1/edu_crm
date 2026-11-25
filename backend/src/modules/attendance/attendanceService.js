const { Op } = require('sequelize');
const { Attendance, Lesson, Student, User, Group, Course } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class AttendanceService {
  /**
   * 1. Yangi davomat yaratish
   */
  async create(data) {
    if (data.lesson_id) {
      const lesson = await Lesson.findByPk(data.lesson_id);
      if (!lesson) {
        throw new Error("Belgilangan lesson_id ga ega dars topilmadi");
      }
    }

    if (data.student_id) {
      const student = await Student.findByPk(data.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (data.marked_by) {
      const user = await User.findByPk(data.marked_by);
      if (!user) {
        throw new Error("Belgilangan marked_by ga ega foydalanuvchi topilmadi");
      }
    }

    const attendance = await Attendance.create(data);
    return attendance;
  }

  /**
   * 2. Barcha davomatlarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, lesson_id, student_id, marked_by } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (lesson_id) where.lesson_id = lesson_id;
    if (student_id) where.student_id = student_id;
    if (marked_by) where.marked_by = marked_by;

    if (search) {
      where[Op.or] = [
        { status: { [Op.iLike]: `%${search}%` } },
        { note: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Attendance.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Lesson ? { 
          model: Lesson, 
          as: "lesson", 
          attributes: ["id", "lesson_date", "start_time", "end_time", "topic", "status"],
          include: Group ? [{ model: Group, as: "group", attributes: ["id", "name"] }] : []
        } : null,
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status", "gender"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        User ? { model: User, as: "marker", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha davomat yozuvini olish
   */
  async getById(id) {
    const attendance = await Attendance.findByPk(id, {
      include: [
        Lesson ? { 
          model: Lesson, 
          as: "lesson", 
          attributes: ["id", "lesson_date", "start_time", "end_time", "topic", "status"],
          include: Group ? [{ model: Group, as: "group", attributes: ["id", "name"] }] : []
        } : null,
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        User ? { model: User, as: "marker", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    if (!attendance) {
      throw new Error("Davomat yozuvi topilmadi");
    }

    return attendance;
  }

  /**
   * 4. Davomat ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      throw new Error("Davomat yozuvi topilmadi");
    }

    if (updateData.lesson_id) {
      const lesson = await Lesson.findByPk(updateData.lesson_id);
      if (!lesson) {
        throw new Error("Belgilangan lesson_id ga ega dars topilmadi");
      }
    }

    if (updateData.student_id) {
      const student = await Student.findByPk(updateData.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (updateData.marked_by) {
      const user = await User.findByPk(updateData.marked_by);
      if (!user) {
        throw new Error("Belgilangan marked_by ga ega foydalanuvchi topilmadi");
      }
    }

    await attendance.update(updateData);
    return attendance;
  }

  /**
   * 5. Davomatni o'chirish
   */
  async delete(id) {
    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      throw new Error("Davomat yozuvi topilmadi");
    }

    await attendance.destroy();
    return { message: "Davomat yozuvi muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Davomatlarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Attendance.findAll({
      where: {
        [Op.or]: [
          { status: { [Op.iLike]: `%${query}%` } },
          { note: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Lesson ? { model: Lesson, as: "lesson", attributes: ["id", "lesson_date", "topic"] } : null,
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
        } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new AttendanceService();
