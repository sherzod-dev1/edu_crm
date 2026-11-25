const { Op } = require('sequelize');
const { Activity, User } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class ActivityService {
  /**
   * 1. Yangi faollik yozuvi yaratish
   */
  async create(data) {
    if (data.user_id) {
      const user = await User.findByPk(data.user_id);
      if (!user) {
        throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
      }
    }

    const activity = await Activity.create(data);
    return activity;
  }

  /**
   * 2. Barcha faolliklarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, user_id, action, entity_type, entity_id } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (user_id) where.user_id = user_id;
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = entity_id;

    if (search) {
      where[Op.or] = [
        { action: { [Op.iLike]: `%${search}%` } },
        { entity_type: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { ip_address: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Activity.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        User ? { 
          model: User, 
          as: "user", 
          attributes: ["id", "full_name", "phone", "email", "role"] 
        } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha faollikni olish
   */
  async getById(id) {
    const activity = await Activity.findByPk(id, {
      include: [
        User ? { 
          model: User, 
          as: "user", 
          attributes: ["id", "full_name", "phone", "email", "role"] 
        } : null
      ].filter(Boolean)
    });

    if (!activity) {
      throw new Error("Faollik topilmadi");
    }

    return activity;
  }

  /**
   * 4. Foydalanuvchiga tegishli faolliklarni olish
   */
  async getByUserId(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
    }

    return await Activity.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * 5. Obyekt turi va ID si bo'yicha faolliklarni olish
   */
  async getByEntity(entityType, entityId) {
    return await Activity.findAll({
      where: {
        entity_type: { [Op.iLike]: entityType },
        entity_id: entityId
      },
      include: [
        User ? { 
          model: User, 
          as: "user", 
          attributes: ["id", "full_name", "role"] 
        } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * 6. Faollikni yangilash
   */
  async update(id, updateData) {
    const activity = await Activity.findByPk(id);
    if (!activity) {
      throw new Error("Faollik topilmadi");
    }

    if (updateData.user_id) {
      const user = await User.findByPk(updateData.user_id);
      if (!user) {
        throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
      }
    }

    await activity.update(updateData);
    return activity;
  }

  /**
   * 7. Faollikni o'chirish
   */
  async delete(id) {
    const activity = await Activity.findByPk(id);
    if (!activity) {
      throw new Error("Faollik topilmadi");
    }

    await activity.destroy();
    return { message: "Faollik yozuvi muvaffaqiyatli o'chirildi" };
  }

  /**
   * 8. Qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Activity.findAll({
      where: {
        [Op.or]: [
          { action: { [Op.iLike]: `%${query}%` } },
          { entity_type: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { ip_address: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        User ? { 
          model: User, 
          as: "user", 
          attributes: ["id", "full_name", "role"] 
        } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new ActivityService();
