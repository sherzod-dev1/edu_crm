const { Op } = require('sequelize');
const { Teacher, User, Branch, Group, Course, GroupStudent } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class TeacherService {
  /**
   * 1. Yangi o'qituvchi yaratish
   */
  async create(data) {
    const user = await User.findByPk(data.user_id);
    if (!user) {
      throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
    }

    if (data.branch_id) {
      const branch = await Branch.findByPk(data.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    const teacher = await Teacher.create(data);
    return teacher;
  }

  /**
   * 2. Barcha o'qituvchilarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, branch_id, specialization } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (branch_id) where.branch_id = branch_id;
    if (specialization) where.specialization = { [Op.iLike]: `%${specialization}%` };

    if (search) {
      where[Op.or] = [
        { specialization: { [Op.iLike]: `%${search}%` } },
        { bio: { [Op.iLike]: `%${search}%` } },
        { salary_type: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Teacher.findAndCountAll({
      where,
      limit: l,
      offset,
      distinct: true,
      order: [['created_at', 'DESC']],
      include: [
        User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar", "plain_password"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
        Group ? {
          model: Group,
          as: "groups",
          attributes: ["id", "name", "course_id", "teacher_id", "status"],
          include: [
            Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
            GroupStudent ? { model: GroupStudent, as: "group_students", attributes: ["id", "student_id"] } : null
          ].filter(Boolean)
        } : null,
        Course ? { model: Course, as: "courses", attributes: ["id", "name"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha o'qituvchini olish
   */
  async getById(id) {
    const teacher = await Teacher.findByPk(id, {
      include: [
        User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar", "plain_password"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
        Group ? {
          model: Group,
          as: "groups",
          attributes: ["id", "name", "course_id", "teacher_id", "status"],
          include: [
            Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
            GroupStudent ? { model: GroupStudent, as: "group_students", attributes: ["id", "student_id"] } : null
          ].filter(Boolean)
        } : null,
        Course ? { model: Course, as: "courses", attributes: ["id", "name"] } : null
      ].filter(Boolean)
    });

    if (!teacher) {
      throw new Error("O'qituvchi topilmadi");
    }

    return teacher;
  }

  /**
   * 4. O'qituvchi ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      throw new Error("O'qituvchi topilmadi");
    }

    if (updateData.user_id && updateData.user_id !== teacher.user_id) {
      const user = await User.findByPk(updateData.user_id);
      if (!user) {
        throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
      }
    }

    if (updateData.branch_id) {
      const branch = await Branch.findByPk(updateData.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    await teacher.update(updateData);

    if (teacher.user_id && User) {
      const userSync = {};
      if (updateData.status) userSync.status = updateData.status;
      if (updateData.branch_id !== undefined) userSync.branch_id = updateData.branch_id;
      if (Object.keys(userSync).length > 0) {
        await User.update(userSync, { where: { id: teacher.user_id } }).catch(() => {});
      }
    }

    return teacher;
  }

  /**
   * 5. O'qituvchini o'chirish
   */
  async delete(id) {
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      throw new Error("O'qituvchi topilmadi");
    }

    const userId = teacher.user_id;

    const { Lesson: Lsn, TrialLesson: TL, Exam: Exm } = require('../../models');
    if (Lsn) await Lsn.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});
    if (TL) await TL.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});
    if (Group) await Group.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});
    if (Course) await Course.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});
    if (Exm) await Exm.update({ teacher_id: null }, { where: { teacher_id: teacher.id } }).catch(() => {});

    await teacher.destroy();

    if (userId && User) {
      await User.destroy({ where: { id: userId } }).catch(async () => {
        await User.update({ status: 'inactive' }, { where: { id: userId } }).catch(() => {});
      });
    }

    return { message: "O'qituvchi muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. O'qituvchilarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Teacher.findAll({
      where: {
        [Op.or]: [
          { specialization: { [Op.iLike]: `%${query}%` } },
          { bio: { [Op.iLike]: `%${query}%` } },
          { salary_type: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar", "plain_password"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null
      ].filter(Boolean)
    });
  }
}

module.exports = new TeacherService();
