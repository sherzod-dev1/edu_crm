const { Op } = require('sequelize');
const { TeacherAttendance, Teacher, User, Branch, Group, Notification, Employee } = require('../../models');

const getTodayTashkentIso = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

class TeacherAttendanceService {
  /**
   * 1. Yangi davomat yaratish yoki mavjud bo'lsa yangilash (Upsert)
   */
  async createOrUpdate(data) {
    if (!data.teacher_id) {
      throw new Error("teacher_id kiritilishi shart");
    }

    if (!data.date) {
      throw new Error("date kiritilishi shart");
    }

    const todayStr = getTodayTashkentIso();
    const targetDate = String(data.date).trim();
    if (targetDate > todayStr) {
      throw new Error(`Kelajakdagi sana (${targetDate}) uchun davomat belgilab bo'lmaydi. Faqat bugungi (${todayStr}) va o'tgan kunlar mumkin.`);
    }

    const teacher = await Teacher.findByPk(data.teacher_id);
    if (!teacher) {
      throw new Error("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
    }

    // Agar branch_id berilmagan bo'lsa, o'qituvchining branch_id sini olamiz
    if (!data.branch_id && teacher.branch_id) {
      data.branch_id = teacher.branch_id;
    }

    if (data.marked_by) {
      const user = await User.findByPk(data.marked_by);
      if (!user) {
        data.marked_by = null;
      }
    }

    const [record, created] = await TeacherAttendance.findOrCreate({
      where: {
        teacher_id: data.teacher_id,
        date: data.date,
      },
      defaults: data,
    });

    if (!created) {
      await record.update(data);
    }

    return await this.getById(record.id);
  }

  /**
   * 2. Bir nechta o'qituvchilar davomatini bir vaqtda saqlash (Bulk Upsert)
   */
  async bulkUpsert(items = [], meta = {}) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Kamida bitta davomat yozuvi kiritilishi kerak");
    }

    const todayStr = getTodayTashkentIso();
    const validItems = items.filter((i) => i && i.date && String(i.date).trim() <= todayStr);
    if (validItems.length === 0) {
      throw new Error("Kiritilgan barcha sanalar kelajakda. Bo'lajak kunlar uchun davomat saqlash taqiqlangan.");
    }

    const results = [];
    for (const item of validItems) {
      const payload = {
        ...item,
        marked_by: meta.marked_by || item.marked_by || null,
        branch_id: meta.branch_id || item.branch_id || null,
      };
      const res = await this.createOrUpdate(payload);
      results.push(res);
    }

    // Buxgalteriyaga avtomatik yo'naltirish va bildirishnoma yaratish
    this.notifyBuxgalterOnAttendanceSave(items, meta).catch((err) => {
      console.warn("Buxgalteriya bildirishnomasida xatolik:", err.message);
    });

    return results;
  }

  /**
   * 3. Barcha o'qituvchilar davomatini olish (Filtrlash bilan)
   */
  async getAll(query = {}) {
    const { date, startDate, endDate, teacher_id, branch_id, status, search } = query;

    const where = {};
    if (date) where.date = date;
    if (status) where.status = status;
    if (teacher_id) where.teacher_id = teacher_id;
    if (branch_id) where.branch_id = branch_id;

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    if (search) {
      where[Op.or] = [
        { note: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const records = await TeacherAttendance.findAll({
      where,
      order: [
        ['date', 'DESC'],
        ['created_at', 'DESC'],
      ],
      include: [
        Teacher ? {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'user_id', 'branch_id', 'specialization', 'status', 'experience_year'],
          include: User ? [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'full_name', 'phone', 'email', 'avatar'],
            }
          ] : []
        } : null,
        Branch ? {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name'],
        } : null,
        User ? {
          model: User,
          as: 'marker',
          attributes: ['id', 'full_name', 'role'],
        } : null,
      ].filter(Boolean),
    });

    return records;
  }

  /**
   * 4. ID bo'yicha bitta davomat yozuvini olish
   */
  async getById(id) {
    const record = await TeacherAttendance.findByPk(id, {
      include: [
        Teacher ? {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'user_id', 'branch_id', 'specialization', 'status'],
          include: User ? [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'full_name', 'phone', 'email', 'avatar'],
            }
          ] : []
        } : null,
        Branch ? {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name'],
        } : null,
        User ? {
          model: User,
          as: 'marker',
          attributes: ['id', 'full_name', 'role'],
        } : null,
      ].filter(Boolean),
    });

    if (!record) {
      throw new Error("O'qituvchi davomat yozuvi topilmadi");
    }

    return record;
  }

  /**
   * 5. Davomat ma'lumotlarini yangilash
   */
  async update(id, updateData) {
    const record = await TeacherAttendance.findByPk(id);
    if (!record) {
      throw new Error("O'qituvchi davomat yozuvi topilmadi");
    }

    if (updateData.date) {
      const todayStr = getTodayTashkentIso();
      const targetDate = String(updateData.date).trim();
      if (targetDate > todayStr) {
        throw new Error(`Kelajakdagi sana (${targetDate}) uchun davomat belgilab bo'lmaydi.`);
      }
    }

    if (updateData.teacher_id) {
      const teacher = await Teacher.findByPk(updateData.teacher_id);
      if (!teacher) {
        throw new Error("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
      }
    }

    if (updateData.marked_by) {
      const user = await User.findByPk(updateData.marked_by);
      if (!user) {
        throw new Error("Belgilangan marked_by ga ega foydalanuvchi topilmadi");
      }
    }

    await record.update(updateData);
    return await this.getById(id);
  }

  /**
   * 6. Davomatni o'chirish
   */
  async delete(id) {
    const record = await TeacherAttendance.findByPk(id);
    if (!record) {
      throw new Error("O'qituvchi davomat yozuvi topilmadi");
    }

    await record.destroy();
    return { message: "O'qituvchi davomati muvaffaqiyatli o'chirildi" };
  }

  /**
   * 7. Davomat statistikasi
   */
  async getStats(query = {}) {
    const { date, branch_id } = query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const where = { date: targetDate };
    if (branch_id) where.branch_id = branch_id;

    const attendances = await TeacherAttendance.findAll({ where });

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    attendances.forEach((att) => {
      const st = (att.status || '').toLowerCase();
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else if (st === 'excused') excused++;
    });

    const totalMarked = attendances.length;
    const teacherWhere = { status: 'active' };
    if (branch_id) teacherWhere.branch_id = branch_id;
    const totalTeachers = await Teacher.count({ where: teacherWhere });

    return {
      date: targetDate,
      totalTeachers,
      totalMarked,
      present,
      absent,
      late,
      excused,
      presentPercentage: totalTeachers > 0 ? Math.round((present / totalTeachers) * 100) : 0,
    };
  }

  /**
   * 8. Buxgalteriyaga avtomatik bildirishnoma yuborish
   */
  async notifyBuxgalterOnAttendanceSave(items = [], meta = {}) {
    try {
      const lateCount = items.filter((i) => (i.status || '').toLowerCase() === 'late').length;
      const absentCount = items.filter((i) => (i.status || '').toLowerCase() === 'absent').length;

      let markerName = 'Nazoratchi';
      if (meta.marked_by) {
        const u = await User.findByPk(meta.marked_by);
        if (u) markerName = u.full_name;
      }

      // 1. Tizimdagi adminlar, managerlar, buxgalterlar va nazoratchilar
      const targetUsers = await User.findAll({
        where: {
          [Op.or]: [
            { role: { [Op.in]: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'MANAGER', 'NAZORATCHI', 'SUPERVISOR', 'INSPECTOR'] } },
          ],
        },
      });

      // 2. Lavozimi buxgalter yoki nazoratchi bo'lgan xodimlar
      const staffEmployees = await Employee.findAll({
        where: {
          [Op.or]: [
            { position: { [Op.iLike]: '%buxgalter%' } },
            { position: { [Op.iLike]: '%nazoratchi%' } },
            { position: { [Op.iLike]: '%supervisor%' } },
            { position: { [Op.iLike]: '%inspector%' } },
          ]
        },
      }).catch(() => []);

      const staffUserIds = staffEmployees.map((e) => Number(e.user_id)).filter(Boolean);
      const userIds = Array.from(new Set([...targetUsers.map((u) => u.id), ...staffUserIds]));

      const notifList = userIds.map((uid) => ({
        user_id: uid,
        title: "💵 O'qituvchilar davomati buxgalteriyaga yo'naltirildi",
        message: `${markerName} tomonidan o'qituvchilar davomati kiritildi. ` +
          (lateCount > 0 ? `⚠️ ${lateCount} ta darsga kechikish qayd etildi (oylikdan ushlanma hisoblandi). ` : '') +
          (absentCount > 0 ? `❌ ${absentCount} ta darsga chiqmaslik qayd etildi. ` : '') +
          `Oylik maosh hisob-kitobi va ushlanmalar avtomatik yangilandi.`,
        type: 'payroll_sync',
        is_read: false,
      }));

      if (notifList.length > 0 && Notification) {
        await Notification.bulkCreate(notifList);
      }
    } catch (err) {
      console.warn("Buxgalterga bildirishnoma yuborishda xatolik:", err.message);
    }
  }

  /**
   * 9. Buxgalteriya uchun Oylik maosh va Davomat ushlanmalari hisoboti (Payroll & Deductions Report)
   */
  async getPayrollReport(query = {}) {
    const { year, month, branch_id, latePenalty } = query;
    const now = new Date();
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);
    const penaltyPerLate = latePenalty !== undefined && !isNaN(latePenalty) ? Number(latePenalty) : 10000; // Standart kechikish jarimasi: 10,000 so'm

    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;

    // Hisoblangan oyning ish kunlari (Yakshanbadan tashqari)
    let workingDays = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayOfWeek = new Date(targetYear, targetMonth - 1, d).getDay();
      if (dayOfWeek !== 0) workingDays++;
    }
    if (workingDays === 0) workingDays = 26;

    const teacherWhere = { status: 'active' };
    if (branch_id) teacherWhere.branch_id = branch_id;

    const teachers = await Teacher.findAll({
      where: teacherWhere,
      include: [
        User ? {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'phone', 'email', 'avatar'],
        } : null,
        Branch ? {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name'],
        } : null,
      ].filter(Boolean),
      order: [['id', 'ASC']],
    });

    const attendances = await TeacherAttendance.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] },
      },
      order: [['date', 'ASC']],
    });

    const attMap = {};
    attendances.forEach((att) => {
      const tId = att.teacher_id;
      if (!attMap[tId]) attMap[tId] = [];
      attMap[tId].push(att);
    });

    let totalBasePayroll = 0;
    let totalLatePenalties = 0;
    let totalAbsenceDeductions = 0;
    let totalNetPayroll = 0;
    let totalLateCount = 0;

    const items = teachers.map((t) => {
      const tAttendances = attMap[t.id] || [];
      const baseSalary = Number(t.salary_amount || 0);

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      const lateRecords = [];

      tAttendances.forEach((a) => {
        const s = (a.status || '').toLowerCase();
        if (s === 'present') {
          presentCount++;
        } else if (s === 'absent') {
          absentCount++;
        } else if (s === 'late') {
          lateCount++;
          lateRecords.push({
            date: a.date,
            check_in: a.check_in || '09:00',
            check_out: a.check_out || null,
            note: a.note || 'Darsga kechikib keldi',
          });
        } else if (s === 'excused') {
          excusedCount++;
        }
      });

      // Kechikishlar jarimasi: har bir kechikish uchun penaltyPerLate
      const lateDeduction = lateCount * penaltyPerLate;

      // Kelmaganlik ushlanmasi: 1 kunlik ish haqi * kelmagan kunlar
      const dailyRate = workingDays > 0 ? Math.round(baseSalary / workingDays) : 0;
      const absenceDeduction = absentCount * dailyRate;

      const totalDeductions = lateDeduction + absenceDeduction;
      const netSalary = Math.max(0, baseSalary - totalDeductions);

      totalBasePayroll += baseSalary;
      totalLatePenalties += lateDeduction;
      totalAbsenceDeductions += absenceDeduction;
      totalNetPayroll += netSalary;
      totalLateCount += lateCount;

      return {
        teacher_id: t.id,
        user_id: t.user?.id,
        full_name: t.user?.full_name || 'Ustoz',
        phone: t.user?.phone || '',
        avatar: t.user?.avatar || null,
        specialization: t.specialization || 'Fan o\'qituvchisi',
        branch_name: t.branch?.name || 'Asosiy filial',
        salary_type: t.salary_type || 'monthly',
        base_salary: baseSalary,
        working_days: workingDays,
        present_count: presentCount,
        absent_count: absentCount,
        late_count: lateCount,
        excused_count: excusedCount,
        late_records: lateRecords,
        daily_rate: dailyRate,
        late_deduction: lateDeduction,
        absence_deduction: absenceDeduction,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        has_deductions: totalDeductions > 0,
      };
    });

    return {
      period: {
        year: targetYear,
        month: targetMonth,
        startDate,
        endDate,
        workingDays,
        penaltyPerLate,
      },
      summary: {
        totalTeachers: teachers.length,
        totalBasePayroll,
        totalLatePenalties,
        totalAbsenceDeductions,
        totalDeductions: totalLatePenalties + totalAbsenceDeductions,
        totalNetPayroll,
        totalLateCount,
      },
      teachers: items,
    };
  }

  /**
   * 9. Kelajak sanalaridagi noto'g'ri yozuvlarni tozalash (Cleanup)
   */
  async cleanupFutureRecords() {
    const todayStr = getTodayTashkentIso();
    const deletedCount = await TeacherAttendance.destroy({
      where: {
        date: { [Op.gt]: todayStr },
      },
    });

    return {
      success: true,
      count: deletedCount,
      message: `${deletedCount} ta kelajak sanasidagi noto'g'ri yozuvlar tozalandi`,
    };
  }
}

module.exports = new TeacherAttendanceService();
