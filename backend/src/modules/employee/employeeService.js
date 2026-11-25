const { Op } = require('sequelize');
const { Employee, User, Branch } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class EmployeeService {
  /**
   * 1. Yangi xodim qo'shish
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

    const employee = await Employee.create(data);
    return employee;
  }

  /**
   * 2. Barcha xodimlarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, branch_id, position } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (branch_id) where.branch_id = branch_id;
    if (position) where.position = { [Op.iLike]: `%${position}%` };

    if (search) {
      where[Op.or] = [
        { position: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Employee.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha xodimni olish
   */
  async getById(id) {
    const employee = await Employee.findByPk(id, {
      include: [
        User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null
      ].filter(Boolean)
    });

    if (!employee) {
      throw new Error("Xodim topilmadi");
    }

    return employee;
  }

  /**
   * 4. Xodim ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const employee = await Employee.findByPk(id);
    if (!employee) {
      throw new Error("Xodim topilmadi");
    }

    if (updateData.user_id && updateData.user_id !== employee.user_id) {
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

    await employee.update(updateData);

    if (employee.user_id && User) {
      const userSync = {};
      if (updateData.status) userSync.status = updateData.status;
      if (updateData.branch_id !== undefined) userSync.branch_id = updateData.branch_id;
      if (Object.keys(userSync).length > 0) {
        await User.update(userSync, { where: { id: employee.user_id } }).catch(() => {});
      }
    }

    return employee;
  }

  /**
   * 5. Xodimni o'chirish
   */
  async delete(id) {
    const employee = await Employee.findByPk(id);
    if (!employee) {
      throw new Error("Xodim topilmadi");
    }

    const userId = employee.user_id;

    await employee.destroy();

    if (userId && User) {
      await User.destroy({ where: { id: userId } }).catch(async () => {
        await User.update({ status: 'inactive' }, { where: { id: userId } }).catch(() => {});
      });
    }

    return { message: "Xodim muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Xodimlarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Employee.findAll({
      where: {
        [Op.or]: [
          { position: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] } : null,
        Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null
      ].filter(Boolean)
    });
  }
}

module.exports = new EmployeeService();
