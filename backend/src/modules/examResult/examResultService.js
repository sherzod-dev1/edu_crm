const { Op } = require('sequelize');
const { ExamResult, Exam, Student, User, Group, Course } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

// Bahoni foiz bo'yicha hisoblash yordamchisi
const calculateGrade = (percent) => {
  if (percent >= 90) return 'A';
  if (percent >= 80) return 'B';
  if (percent >= 70) return 'C';
  if (percent >= 60) return 'D';
  return 'F';
};

class ExamResultService {
  /**
   * 1. Yangi imtihon natijasini yaratish
   */
  async create(data) {
    let exam = null;
    if (data.exam_id) {
      exam = await Exam.findByPk(data.exam_id);
      if (!exam) {
        throw new Error("Belgilangan exam_id ga ega imtihon topilmadi");
      }
    }

    if (data.student_id) {
      const student = await Student.findByPk(data.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (data.created_by) {
      const user = await User.findByPk(data.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    const score = Number(data.score);
    const maxScore = exam ? Number(exam.max_score) || 100 : 100;
    const passingScore = exam ? Number(exam.passing_score) || 60 : 60;

    if (data.percentage === undefined || data.percentage === null) {
      data.percentage = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;
    }

    if (data.passed === undefined || data.passed === null) {
      data.passed = score >= passingScore;
    }

    if (!data.grade) {
      data.grade = calculateGrade(data.percentage);
    }

    const examResult = await ExamResult.create(data);
    return examResult;
  }

  /**
   * 2. Barcha natijalarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, exam_id, student_id, passed, grade } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (exam_id) where.exam_id = exam_id;
    if (student_id) where.student_id = student_id;
    if (grade) where.grade = grade;
    if (passed !== undefined && passed !== null && passed !== '') {
      where.passed = passed === 'true' || passed === true;
    }

    if (search) {
      where[Op.or] = [
        { grade: { [Op.iLike]: `%${search}%` } },
        { comment: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await ExamResult.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Exam ? { 
          model: Exam, 
          as: "exam", 
          attributes: ["id", "title", "exam_date", "max_score", "passing_score", "status"],
          include: [
            Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
            Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
          ].filter(Boolean)
        } : null,
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha imtihon natijasini olish
   */
  async getById(id) {
    const examResult = await ExamResult.findByPk(id, {
      include: [
        Exam ? { 
          model: Exam, 
          as: "exam", 
          attributes: ["id", "title", "exam_date", "max_score", "passing_score", "status"],
          include: [
            Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
            Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null
          ].filter(Boolean)
        } : null,
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    if (!examResult) {
      throw new Error("Imtihon natijasi topilmadi");
    }

    return examResult;
  }

  /**
   * 4. Imtihon natijasini yangilash
   */
  async update(id, updateData) {
    const examResult = await ExamResult.findByPk(id);
    if (!examResult) {
      throw new Error("Imtihon natijasi topilmadi");
    }

    let exam = null;
    if (updateData.exam_id) {
      exam = await Exam.findByPk(updateData.exam_id);
      if (!exam) {
        throw new Error("Belgilangan exam_id ga ega imtihon topilmadi");
      }
    } else {
      exam = await Exam.findByPk(examResult.exam_id);
    }

    if (updateData.student_id) {
      const student = await Student.findByPk(updateData.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (updateData.created_by) {
      const user = await User.findByPk(updateData.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    if (updateData.score !== undefined) {
      const score = Number(updateData.score);
      const maxScore = exam ? Number(exam.max_score) || 100 : 100;
      const passingScore = exam ? Number(exam.passing_score) || 60 : 60;

      if (updateData.percentage === undefined) {
        updateData.percentage = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;
      }
      if (updateData.passed === undefined) {
        updateData.passed = score >= passingScore;
      }
      if (!updateData.grade) {
        updateData.grade = calculateGrade(updateData.percentage);
      }
    }

    await examResult.update(updateData);
    return examResult;
  }

  /**
   * 5. Imtihon natijasini o'chirish
   */
  async delete(id) {
    const examResult = await ExamResult.findByPk(id);
    if (!examResult) {
      throw new Error("Imtihon natijasi topilmadi");
    }

    await examResult.destroy();
    return { message: "Imtihon natijasi muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await ExamResult.findAll({
      where: {
        [Op.or]: [
          { grade: { [Op.iLike]: `%${query}%` } },
          { comment: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Exam ? { model: Exam, as: "exam", attributes: ["id", "title"] } : null,
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

module.exports = new ExamResultService();
