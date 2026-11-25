const { Op } = require('sequelize');
const { GroupStudent, Group, Student, User, Course } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class GroupStudentService {
  /**
   * 1. Guruhga talaba biriktirish
   */
  async create(data) {
    if (data.group_id) {
      const group = await Group.findByPk(data.group_id);
      if (!group) {
        throw new Error("Belgilangan group_id ga ega guruh topilmadi");
      }
    }

    if (data.student_id) {
      const student = await Student.findByPk(data.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    const groupStudent = await GroupStudent.create(data);
    return groupStudent;
  }

  /**
   * 2. Barcha guruh talabalarini sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, group_id, student_id } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (group_id) where.group_id = group_id;
    if (student_id) where.student_id = student_id;

    if (search) {
      where[Op.or] = [
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await GroupStudent.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Group ? { 
          model: Group, 
          as: "group", 
          attributes: ["id", "name", "days", "start_time", "end_time", "status"],
          include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
        } : null,
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha guruh talabasini olish
   */
  async getById(id) {
    const groupStudent = await GroupStudent.findByPk(id, {
      include: [
        Group ? { 
          model: Group, 
          as: "group", 
          attributes: ["id", "name", "days", "start_time", "end_time", "status"],
          include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
        } : null,
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null
      ].filter(Boolean)
    });

    if (!groupStudent) {
      throw new Error("Guruh talabasi topilmadi");
    }

    return groupStudent;
  }

  /**
   * 4. Guruh talabasi ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const groupStudent = await GroupStudent.findByPk(id);
    if (!groupStudent) {
      throw new Error("Guruh talabasi topilmadi");
    }

    if (updateData.group_id) {
      const group = await Group.findByPk(updateData.group_id);
      if (!group) {
        throw new Error("Belgilangan group_id ga ega guruh topilmadi");
      }
    }

    if (updateData.student_id) {
      const student = await Student.findByPk(updateData.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    await groupStudent.update(updateData);
    return groupStudent;
  }

  /**
   * 5. Guruh talabasini o'chirish
   */
  async delete(id) {
    const groupStudent = await GroupStudent.findByPk(id);
    if (!groupStudent) {
      throw new Error("Guruh talabasi topilmadi");
    }

    await groupStudent.destroy();
    return { message: "Talaba guruhdan muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await GroupStudent.findAll({
      where: {
        [Op.or]: [
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Group ? { model: Group, as: "group", attributes: ["id", "name"] } : null,
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new GroupStudentService();
