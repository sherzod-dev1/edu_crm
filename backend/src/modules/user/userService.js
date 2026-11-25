const { Op } = require('sequelize');
const User = require('./userModel');
const { hashPassword, comparePassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');
const { getPagination, getPagingData } = require('../../utils/pagination');

class UserService {
  async register(userData) {
    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { phone: userData.phone },
          ...(userData.email ? [{ email: userData.email }] : [])
        ]
      }
    });

    if (existing) {
      throw new Error('Ushbu telefon raqam yoki email allaqachon mavjud');
    }

    const hashedPassword = await hashPassword(userData.password);
    const newUser = await User.create({
      ...userData,
      password: hashedPassword
    });

    const userObj = newUser.toJSON();
    delete userObj.password;

    const token = signToken({ id: userObj.id, role: userObj.role, phone: userObj.phone });
    return { user: userObj, token };
  }

  async login(phone, password) {
    const user = await User.findOne({ where: { phone, is_active: true } });
    if (!user) {
      throw new Error('Telefon raqam yoki parol noto\'g\'ri');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new Error('Telefon raqam yoki parol noto\'g\'ri');
    }

    const userObj = user.toJSON();
    delete userObj.password;

    const token = signToken({ id: userObj.id, role: userObj.role, phone: userObj.phone });
    return { user: userObj, token };
  }

  async getAll(query) {
    const { page, limit, search, role, branch_id, is_active } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (role) where.role = role;
    if (branch_id) where.branch_id = branch_id;
    if (typeof is_active !== 'undefined') where.is_active = is_active === 'true' || is_active === true;

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await User.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    return getPagingData(data, p, l);
  }

  async getById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) throw new Error('Foydalanuvchi topilmadi');
    return user;
  }

  async create(data) {
    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { phone: data.phone },
          ...(data.email ? [{ email: data.email }] : [])
        ]
      }
    });
    if (existing) throw new Error('Ushbu telefon yoki email allaqachon ro\'yxatdan o\'tgan');

    const hashedPassword = await hashPassword(data.password);
    const user = await User.create({ ...data, password: hashedPassword });
    const userObj = user.toJSON();
    delete userObj.password;
    return userObj;
  }

  async update(id, updateData) {
    const user = await User.findByPk(id);
    if (!user) throw new Error('Foydalanuvchi topilmadi');

    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }

    await user.update(updateData);
    const userObj = user.toJSON();
    delete userObj.password;
    return userObj;
  }

  async delete(id) {
    const user = await User.findByPk(id);
    if (!user) throw new Error('Foydalanuvchi topilmadi');
    await user.destroy();
    return { message: 'Foydalanuvchi muvaffaqiyatli o\'chirildi' };
  }
}

module.exports = new UserService();
