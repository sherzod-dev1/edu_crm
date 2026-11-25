const { Op } = require('sequelize');
const { Classroom, Branch } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class ClassroomService {
  /**
   * 1. Yangi xona yaratish
   */
  async create(data) {
    if (data.branch_id) {
      const branch = await Branch.findByPk(data.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    const classroom = await Classroom.create(data);
    return classroom;
  }

  /**
   * 2. Barcha xonalarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, branch_id, room_type } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (branch_id) where.branch_id = branch_id;
    if (room_type) where.room_type = room_type;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { room_type: { [Op.iLike]: `%${search}%` } },
        { equipment: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Classroom.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: Branch ? [{ model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] }] : []
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha xonani olish
   */
  async getById(id) {
    const classroom = await Classroom.findByPk(id, {
      include: Branch ? [{ model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] }] : []
    });

    if (!classroom) {
      throw new Error("Xona topilmadi");
    }

    return classroom;
  }

  /**
   * 4. Xona ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      throw new Error("Xona topilmadi");
    }

    if (updateData.branch_id) {
      const branch = await Branch.findByPk(updateData.branch_id);
      if (!branch) {
        throw new Error("Belgilangan branch_id ga ega filial topilmadi");
      }
    }

    await classroom.update(updateData);
    return classroom;
  }

  /**
   * 5. Xonani o'chirish
   */
  async delete(id) {
    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      throw new Error("Xona topilmadi");
    }

    await classroom.destroy();
    return { message: "Xona muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Xonalarni qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Classroom.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { room_type: { [Op.iLike]: `%${query}%` } },
          { equipment: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: Branch ? [{ model: Branch, as: "branch", attributes: ["id", "name"] }] : [],
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new ClassroomService();
