const { Op } = require('sequelize');
const { Certificate, Student, Course, User } = require('../../models');
const { getPagination, getPagingData } = require('../../utils/pagination');

// Avtomatik sertifikat raqami va tekshirish kodi yaratish
const generateCertNumber = () => {
  return 'CERT-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000);
};

const generateVerificationCode = () => {
  return 'VER-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

class CertificateService {
  /**
   * 1. Yangi sertifikat yaratish
   */
  async create(data) {
    if (data.student_id) {
      const student = await Student.findByPk(data.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (data.course_id) {
      const course = await Course.findByPk(data.course_id);
      if (!course) {
        throw new Error("Belgilangan course_id ga ega kurs topilmadi");
      }
    }

    if (data.created_by) {
      const user = await User.findByPk(data.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    if (!data.certificate_number) {
      data.certificate_number = generateCertNumber();
    }

    if (!data.verification_code) {
      data.verification_code = generateVerificationCode();
    }

    const certificate = await Certificate.create(data);
    return certificate;
  }

  /**
   * 2. Barcha sertifikatlarni sahifalash (pagination) va filtrlash bilan olish
   */
  async getAll(query = {}) {
    const { page, limit, search, status, student_id, course_id } = query;
    const { limit: l, offset, page: p } = getPagination(page, limit);

    const where = {};
    if (status) where.status = status;
    if (student_id) where.student_id = student_id;
    if (course_id) where.course_id = course_id;

    if (search) {
      where[Op.or] = [
        { certificate_number: { [Op.iLike]: `%${search}%` } },
        { verification_code: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const data = await Certificate.findAndCountAll({
      where,
      limit: l,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "level"] } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    return getPagingData(data, p, l);
  }

  /**
   * 3. ID bo'yicha sertifikatni olish
   */
  async getById(id) {
    const certificate = await Certificate.findByPk(id, {
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id", "parent_name", "parent_phone", "status"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
        } : null,
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "level"] } : null,
        User ? { model: User, as: "creator", attributes: ["id", "full_name", "role"] } : null
      ].filter(Boolean)
    });

    if (!certificate) {
      throw new Error("Sertifikat topilmadi");
    }

    return certificate;
  }

  /**
   * 4. Sertifikat ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const certificate = await Certificate.findByPk(id);
    if (!certificate) {
      throw new Error("Sertifikat topilmadi");
    }

    if (updateData.student_id) {
      const student = await Student.findByPk(updateData.student_id);
      if (!student) {
        throw new Error("Belgilangan student_id ga ega talaba topilmadi");
      }
    }

    if (updateData.course_id) {
      const course = await Course.findByPk(updateData.course_id);
      if (!course) {
        throw new Error("Belgilangan course_id ga ega kurs topilmadi");
      }
    }

    if (updateData.created_by) {
      const user = await User.findByPk(updateData.created_by);
      if (!user) {
        throw new Error("Belgilangan created_by ga ega foydalanuvchi topilmadi");
      }
    }

    await certificate.update(updateData);
    return certificate;
  }

  /**
   * 5. Sertifikatni o'chirish
   */
  async delete(id) {
    const certificate = await Certificate.findByPk(id);
    if (!certificate) {
      throw new Error("Sertifikat topilmadi");
    }

    await certificate.destroy();
    return { message: "Sertifikat muvaffaqiyatli o'chirildi" };
  }

  /**
   * 6. Qidirish
   */
  async search(query) {
    if (!query) {
      throw new Error("Qidiruv kalit so'zi kiritilishi shart");
    }

    return await Certificate.findAll({
      where: {
        [Op.or]: [
          { certificate_number: { [Op.iLike]: `%${query}%` } },
          { verification_code: { [Op.iLike]: `%${query}%` } },
          { title: { [Op.iLike]: `%${query}%` } },
          { status: { [Op.iLike]: `%${query}%` } }
        ]
      },
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
        } : null,
        Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null
      ].filter(Boolean),
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * 7. Verifikatsiya qilish
   */
  async verify(code) {
    const certificate = await Certificate.findOne({
      where: {
        [Op.or]: [
          { verification_code: code },
          { certificate_number: code }
        ]
      },
      include: [
        Student ? { 
          model: Student, 
          as: "student", 
          attributes: ["id"],
          include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
        } : null,
        Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "level"] } : null
      ].filter(Boolean)
    });

    if (!certificate) {
      throw new Error("Bunday kodga ega sertifikat topilmadi yoki haqiqiy emas");
    }

    return {
      valid: true,
      certificate
    };
  }
}

module.exports = new CertificateService();
