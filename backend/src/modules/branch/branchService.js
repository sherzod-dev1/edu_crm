const { Op } = require('sequelize');
const { Branch, User } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class BranchService {
  /**
   * 1. Yangi filial yaratish
   */
  async create(data) {
    const existing = await Branch.findOne({
      where: { name: data.name }
    });

    if (existing) {
      throw new Error("Ushbu nomdagi filial allaqachon mavjud");
    }

    if (data.manager_id) {
      const manager = await User.findByPk(data.manager_id);
      if (!manager) {
        throw new Error("Belgilangan manager topilmadi");
      }
    }

    const branch = await Branch.create(data);
    return branch;
  }

  /**
   * 2. Barcha filiallarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Branch.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: User ? [{ model: User, as: "manager", attributes: ["id", "full_name", "phone", "email"] }] : []
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha filialni olish
   */
  async getById(id) {
    const branch = await Branch.findByPk(id, {
      include: User ? [{ model: User, as: "manager", attributes: ["id", "full_name", "phone", "email"] }] : []
    });

    if (!branch) {
      throw new Error("Filial topilmadi");
    }

    return branch;
  }

  /**
   * 4. Filial ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const branch = await Branch.findByPk(id);
    if (!branch) {
      throw new Error("Filial topilmadi");
    }

    if (updateData.name && updateData.name !== branch.name) {
      const existing = await Branch.findOne({ where: { name: updateData.name } });
      if (existing) {
        throw new Error("Ushbu nomdagi filial allaqachon mavjud");
      }
    }

    if (updateData.manager_id) {
      const manager = await User.findByPk(updateData.manager_id);
      if (!manager) {
        throw new Error("Belgilangan manager topilmadi");
      }
    }

    await branch.update(updateData);
    return branch;
  }

  /**
   * 5. Filialni o'chirish
   */
  async delete(id) {
    const branch = await Branch.findByPk(id);
    if (!branch) {
      throw new Error("Filial topilmadi");
    }

    await branch.destroy();
    return { message: "Filial muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Filiallarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Branch.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { address: { [Op.iLike]: `%${query}%` } },
          { phone: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: User ? [{ model: User, as: "manager", attributes: ["id", "full_name", "phone", "email"] }] : []
    });
  }
}

module.exports = new BranchService();
