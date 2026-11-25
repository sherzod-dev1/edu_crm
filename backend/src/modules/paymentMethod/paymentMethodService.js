const { Op } = require('sequelize');
const { PaymentMethod } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class PaymentMethodService {
  /**
   * 1. Yangi to'lov usulini yaratish
   */
  async create(data) {
    if (data.code) {
      data.code = data.code.toLowerCase().trim();
      const existingMethod = await PaymentMethod.findOne({ where: { code: data.code } });
      if (existingMethod) {
        throw new Error("Bunday kodga ega to'lov usuli allaqachon mavjud");
      }
    }

    const paymentMethod = await PaymentMethod.create(data);
    return paymentMethod;
  }

  /**
   * 2. Barcha to'lov usullarini sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await PaymentMethod.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']]
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha to'lov usulini olish
   */
  async getById(id) {
    const paymentMethod = await PaymentMethod.findByPk(id);
    if (!paymentMethod) {
      throw new Error("To'lov usuli topilmadi");
    }

    return paymentMethod;
  }

  /**
   * 4. To'lov usuli ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const paymentMethod = await PaymentMethod.findByPk(id);
    if (!paymentMethod) {
      throw new Error("To'lov usuli topilmadi");
    }

    if (updateData.code) {
      updateData.code = updateData.code.toLowerCase().trim();
      const existingMethod = await PaymentMethod.findOne({
        where: {
          code: updateData.code,
          id: { [Op.ne]: id }
        }
      });
      if (existingMethod) {
        throw new Error("Bunday kodga ega to'lov usuli allaqachon mavjud");
      }
    }

    await paymentMethod.update(updateData);
    return paymentMethod;
  }

  /**
   * 5. To'lov usulini o'chirish
   */
  async delete(id) {
    const paymentMethod = await PaymentMethod.findByPk(id);
    if (!paymentMethod) {
      throw new Error("To'lov usuli topilmadi");
    }

    await paymentMethod.destroy();
    return { message: "To'lov usuli muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. To'lov usullarini qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await PaymentMethod.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { code: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new PaymentMethodService();
