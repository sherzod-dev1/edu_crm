const { Op } = require('sequelize');
const { TrialLesson, Lead, Course, Teacher, Branch, Classroom, User } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class TrialLessonService {
  /**
   * 1. Yangi sinov darsi yaratish
   */
  async create(data) {
    if (data.lead_id) {
      const lead = await Lead.findByPk(data.lead_id);
      if (!lead) {
        throw new Error("Belgilangan lead_id ga ega lid topilmadi");
      }
    }

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

    if (data.classroom_id) {
      const classroom = await Classroom.findByPk(data.classroom_id);
      if (!classroom) {
        throw new Error("Belgilangan classroom_id ga ega xona topilmadi");
      }
    }

    if (data.created_by) {
      const user = await User.findByPk(data.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    const trialLesson = await TrialLesson.create(data);
    return trialLesson;
  }

  /**
   * 2. Barcha sinov darslarini sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, lead_id, course_id, teacher_id, branch_id, classroom_id, trial_date } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (lead_id) where.lead_id = lead_id;
    if (course_id) where.course_id = course_id;
    if (teacher_id) where.teacher_id = teacher_id;
    if (branch_id) where.branch_id = branch_id;
    if (classroom_id) where.classroom_id = classroom_id;
    if (trial_date) where.trial_date = trial_date;

    if (search) {
      where[Op.or] = [
        { status: { [Op.iLike]: `%${search}%` } },
        { feedback: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await TrialLesson.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['trial_date', 'DESC'], ['created_at', 'DESC']],
      include: [
        Lead ? { model: Lead, as: "lead", attributes: ["id", "full_name", "phone", "email", "status"] } : null,
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "price"] } : null,
        Teacher ? { 
          model: Teacher, 
          as: "teacher", 
          attributes: ["id", "specialization"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone"] }] : []
        } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address"] } : null,
        Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "floor", "capacity"] } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null,
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha sinov darsini olish
   */
  async getById(id) {
    const trialLesson = await TrialLesson.findByPk(id, {
      include: [
        Lead ? { model: Lead, as: "lead", attributes: ["id", "full_name", "phone", "email", "status"] } : null,
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "price"] } : null,
        Teacher ? { 
          model: Teacher, 
          as: "teacher", 
          attributes: ["id", "specialization"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone"] }] : []
        } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "address"] } : null,
        Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "floor", "capacity"] } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null,
      ].filter(Boolean)
    });

    if (!trialLesson) {
      throw new Error("Sinov darsi topilmadi");
    }

    return trialLesson;
  }

  /**
   * 4. Sinov darsini yangilash
   */
  async update(id, updateData) {
    const trialLesson = await TrialLesson.findByPk(id);
    if (!trialLesson) {
      throw new Error("Sinov darsi topilmadi");
    }

    if (updateData.lead_id) {
      const lead = await Lead.findByPk(updateData.lead_id);
      if (!lead) {
        throw new Error("Belgilangan lead_id ga ega lid topilmadi");
      }
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

    if (updateData.classroom_id) {
      const classroom = await Classroom.findByPk(updateData.classroom_id);
      if (!classroom) {
        throw new Error("Belgilangan classroom_id ga ega xona topilmadi");
      }
    }

    if (updateData.created_by) {
      const user = await User.findByPk(updateData.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    await trialLesson.update(updateData);
    return trialLesson;
  }

  /**
   * 5. Sinov darsini o'chirish
   */
  async delete(id) {
    const trialLesson = await TrialLesson.findByPk(id);
    if (!trialLesson) {
      throw new Error("Sinov darsi topilmadi");
    }

    await trialLesson.destroy();
    return { message: "Sinov darsi muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await TrialLesson.findAll({
      where: {
        [Op.or]: [
          { status: { [Op.iLike]: `%${query}%` } },
          { feedback: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Lead ? { model: Lead, as: "lead", attributes: ["id", "full_name", "phone"] } : null,
        Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null
      ].filter(Boolean),
      order: [['trial_date', 'DESC']]
    });
  }
}

module.exports = new TrialLessonService();
