const { Op } = require('sequelize');
const { Student, User, Branch, Group, Course, GroupStudent } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

const formatStudentData = (s) => {
  if (!s) return s;
  const data = s.toJSON ? s.toJSON() : { ...s };
  const primaryGS = data.group_students && data.group_students[0];
  if (!data.group_id && primaryGS?.group_id) {
    data.group_id = primaryGS.group_id;
  }
  if (!data.group && primaryGS?.group) {
    data.group = primaryGS.group;
  }
  if (!data.course_id && (primaryGS?.group?.course_id || data.group?.course_id)) {
    data.course_id = primaryGS?.group?.course_id || data.group?.course_id;
  }
  if (!data.course && (primaryGS?.group?.course || data.group?.course)) {
    data.course = primaryGS?.group?.course || data.group?.course;
  }
  return data;
};

const getStudentIncludes = () => [
  User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar", "plain_password"] } : null,
  Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
  Group ? { model: Group, as: "group", attributes: ["id", "name", "days", "lesson_time", "course_id"] } : null,
  Course ? { model: Course, as: "course", attributes: ["id", "name", "price"] } : null,
  GroupStudent ? {
    model: GroupStudent,
    as: "group_students",
    include: Group ? [{
      model: Group,
      as: "group",
      attributes: ["id", "name", "days", "lesson_time", "course_id"],
      include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
    }] : []
  } : null
].filter(Boolean);

class StudentService {
  /**
   * 1. Yangi o'quvchi qo'shish
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

    let targetGroupId = data.group_id ? Number(data.group_id) : null;
    let targetCourseId = data.course_id ? Number(data.course_id) : null;

    if (!targetGroupId && targetCourseId && Group) {
      const matchedGroup = await Group.findOne({ where: { course_id: targetCourseId } });
      if (matchedGroup) targetGroupId = matchedGroup.id;
    } else if (targetGroupId && !targetCourseId && Group) {
      const grp = await Group.findByPk(targetGroupId);
      if (grp) targetCourseId = grp.course_id;
    }

    data.group_id = targetGroupId || null;
    data.course_id = targetCourseId || null;

    const student = await Student.create(data);

    if (targetGroupId && GroupStudent) {
      await GroupStudent.create({
        group_id: targetGroupId,
        student_id: student.id,
        joined_at: student.joined_at || new Date(),
        status: student.status || 'active'
      }).catch((err) => console.warn('GroupStudent create warning:', err.message));
    }

    const fullStudent = await Student.findByPk(student.id, {
      include: getStudentIncludes()
    });

    return formatStudentData(fullStudent || student);
  }

  /**
   * 2. Barcha o'quvchilarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, branch_id, gender } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (branch_id) where.branch_id = branch_id;
    if (gender) where.gender = gender;

    if (search) {
      where[Op.or] = [
        { parent_name: { [Op.iLike]: `%${search}%` } },
        { parent_phone: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { education: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Student.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: getStudentIncludes()
    });

    data.rows = data.rows.map((s) => formatStudentData(s));

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha o'quvchini olish
   */
  async getById(id) {
    const student = await Student.findByPk(id, {
      include: getStudentIncludes()
    });

    if (!student) {
      throw new Error("O'quvchi topilmadi");
    }

    return formatStudentData(student);
  }

  /**
   * 4. O'quvchi ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const student = await Student.findByPk(id);
    if (!student) {
      throw new Error("O'quvchi topilmadi");
    }

    if (updateData.user_id && updateData.user_id !== student.user_id) {
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

    const { group_id, course_id } = updateData;
    let targetGroupId = group_id !== undefined ? (group_id ? Number(group_id) : null) : undefined;
    let targetCourseId = course_id !== undefined ? (course_id ? Number(course_id) : null) : undefined;

    if (targetCourseId && targetGroupId === undefined && Group) {
      const matchedGroup = await Group.findOne({ where: { course_id: targetCourseId } });
      if (matchedGroup) targetGroupId = matchedGroup.id;
    } else if (targetGroupId && targetCourseId === undefined && Group) {
      const grp = await Group.findByPk(targetGroupId);
      if (grp) targetCourseId = grp.course_id;
    }

    if (targetGroupId !== undefined) updateData.group_id = targetGroupId;
    if (targetCourseId !== undefined) updateData.course_id = targetCourseId;

    await student.update(updateData);

    if (student.user_id && User) {
      const userSync = {};
      if (updateData.status) userSync.status = updateData.status;
      if (updateData.branch_id !== undefined) userSync.branch_id = updateData.branch_id;
      if (Object.keys(userSync).length > 0) {
        await User.update(userSync, { where: { id: student.user_id } }).catch(() => {});
      }
    }

    const finalGroupId = targetGroupId !== undefined ? targetGroupId : student.group_id;
    if (finalGroupId && GroupStudent) {
      const existingEnrollment = await GroupStudent.findOne({ where: { student_id: student.id } });
      if (existingEnrollment) {
        await existingEnrollment.update({ group_id: finalGroupId, status: student.status || 'active' });
      } else {
        await GroupStudent.create({
          group_id: finalGroupId,
          student_id: student.id,
          joined_at: student.joined_at || new Date(),
          status: student.status || 'active'
        });
      }
    } else if (targetGroupId === null && GroupStudent) {
      await GroupStudent.destroy({ where: { student_id: student.id } });
    }

    const fullStudent = await Student.findByPk(student.id, {
      include: getStudentIncludes()
    });

    return formatStudentData(fullStudent || student);
  }

  /**
   * 5. O'quvchini o'chirish
   */
  async delete(id) {
    const student = await Student.findByPk(id);
    if (!student) {
      throw new Error("O'quvchi topilmadi");
    }

    const userId = student.user_id;

    const { Attendance: Att, Payment: Pmt, Invoice: Inv, Certificate: Cert, ExamResult: ER } = require('../../models');
    if (Att) await Att.destroy({ where: { student_id: student.id } }).catch(() => {});
    if (Pmt) await Pmt.destroy({ where: { student_id: student.id } }).catch(() => {});
    if (Inv) await Inv.destroy({ where: { student_id: student.id } }).catch(() => {});
    if (Cert) await Cert.destroy({ where: { student_id: student.id } }).catch(() => {});
    if (ER) await ER.destroy({ where: { student_id: student.id } }).catch(() => {});
    if (GroupStudent) {
      await GroupStudent.destroy({ where: { student_id: student.id } }).catch(() => {});
    }

    await student.destroy();

    if (userId && User) {
      await User.destroy({ where: { id: userId } }).catch(async () => {
        await User.update({ status: 'inactive' }, { where: { id: userId } }).catch(() => {});
      });
    }

    return { message: "O'quvchi muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. O'quvchilarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    const students = await Student.findAll({
      where: {
        [Op.or]: [
          { parent_name: { [Op.iLike]: `%${query}%` } },
          { parent_phone: { [Op.iLike]: `%${query}%` } },
          { address: { [Op.iLike]: `%${query}%` } },
          { education: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: getStudentIncludes()
    });

    return students.map((s) => formatStudentData(s));
  }
}

module.exports = new StudentService();
