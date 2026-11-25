const { Op } = require('sequelize');
const { Notification, User } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

class NotificationService {
  /**
   * 1. Yangi xabarnoma yaratish
   */
  async create(data) {
    if (data.user_id) {
      const user = await User.findByPk(data.user_id);
      if (!user) {
        throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
      }
    }

    const notification = await Notification.create(data);
    return notification;
  }

  /**
   * 2. Barcha xabarnomalarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, user_id, is_read, type } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (user_id) where.user_id = user_id;
    if (is_read !== undefined) where.is_read = is_read === 'true' || is_read === true;
    if (type) where.type = type;

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { message: { [Op.iLike]: `%${search}%` } },
        { type: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Notification.findAndCountAll({
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
   * 3. ID bo'yicha xabarnomani olish
   */
  async getById(id) {
    const notification = await Notification.findByPk(id, {
      include: [
        User ? { 
          model: User, 
          as: "user", 
          attributes: ["id", "full_name", "phone", "email", "role"] 
        } : null
      ].filter(Boolean)
    });

    if (!notification) {
      throw new Error("Xabarnoma topilmadi");
    }

    return notification;
  }

  /**
   * 4. Foydalanuvchiga tegishli xabarnomalarni olish
   */
  async getByUserId(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
    }

    return await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * 5. Xabarnomani yangilash
   */
  async update(id, updateData) {
    const notification = await Notification.findByPk(id);
    if (!notification) {
      throw new Error("Xabarnoma topilmadi");
    }

    if (updateData.user_id) {
      const user = await User.findByPk(updateData.user_id);
      if (!user) {
        throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
      }
    }

    await notification.update(updateData);
    return notification;
  }

  /**
   * 6. Xabarnomani o'qildi deb belgilash
   */
  async markAsRead(id) {
    const notification = await Notification.findByPk(id);
    if (!notification) {
      throw new Error("Xabarnoma topilmadi");
    }

    await notification.update({
      is_read: true,
      read_at: new Date()
    });

    return notification;
  }

  /**
   * 7. Foydalanuvchining barcha xabarnomalarini o'qildi deb belgilash
   */
  async markAllAsRead(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("Belgilangan user_id ga ega foydalanuvchi topilmadi");
    }

    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: userId, is_read: false } }
    );

    return { message: "Barcha xabarnomalar o'qilgan deb belgilandi" };
  }

  /**
   * 8. Xabarnomani o'chirish
   */
  async delete(id) {
    const notification = await Notification.findByPk(id);
    if (!notification) {
      throw new Error("Xabarnoma topilmadi");
    }

    await notification.destroy();
    return { message: "Xabarnoma muvaffaqiyatli o'chirildi" };
  }

  /**
   * 9. Qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Notification.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { message: { [Op.iLike]: `%${query}%` } },
          { type: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        User ? { 
          model: User, 
          as: "user", 
          attributes: ["id", "full_name", "phone", "email", "role"] 
        } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new NotificationService();
