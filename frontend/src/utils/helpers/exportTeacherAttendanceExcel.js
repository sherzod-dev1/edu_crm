import * as XLSX from 'xlsx';

const UZ_DAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const UZ_DAYS_FULL = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
];

const MONTH_NAMES_UZ = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentyabr',
  'Oktyabr',
  'Noyabr',
  'Dekabr',
];

const STATUS_META = {
  present: { text: "Keldi", code: "K", label: "Keldi (K)" },
  absent: { text: "Kelmadi", code: "Y", label: "Kelmadi (Y)" },
  late: { text: "Kechikdi", code: "KCH", label: "Kechikdi (KCH)" },
  excused: { text: "Sababli", code: "S", label: "Sababli (S)" },
};

/**
 * Excel ustun raqamini harfga aylantirish (1 -> 'A', 26 -> 'Z', 27 -> 'AA')
 */
export const getColLetter = (colIdx) => {
  let temp = '';
  let num = colIdx;
  while (num > 0) {
    let rem = (num - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    num = Math.floor((num - 1) / 26);
  }
  return temp;
};

/**
 * Ikki sana oralig'idagi barcha kunlarni generatsiya qilish
 */
export const generateDaysBetween = (startStr, endStr) => {
  const days = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return days;
  }
  const curr = new Date(start);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const dateIso = `${y}-${m}-${d}`;
    const dayOfWeek = curr.getDay();
    days.push({
      dateIso,
      dayNumber: curr.getDate(),
      dayNumberPadded: d,
      dayOfWeek,
      shortDayName: UZ_DAYS_SHORT[dayOfWeek],
      fullDayName: UZ_DAYS_FULL[dayOfWeek],
      isSunday: dayOfWeek === 0,
    });
    curr.setDate(curr.getDate() + 1);
  }
  return days;
};

/**
 * O'qituvchilar davomatini Excel (.xlsx) formatida filtrlar bilan yuklab olish
 */
export const exportTeacherAttendanceExcel = async ({
  teachers = [],
  groups = [],
  branches = [],
  matrix = {},
  monthDays = [],
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  payrollData = null,
  latePenaltyRate = 10000,
  filters = {
    teacherId: 'all',
    status: 'all',
    branchId: 'all',
    dateMode: 'month', // 'month' | 'range' | 'single'
    startDate: '',
    endDate: '',
    singleDate: '',
  },
  sheetOptions = {
    detailed: true,
    matrix: true,
    summary: true,
  },
  extraRecords = [], // optional raw records from API
}) => {
  // 1. O'qituvchilarni filtrlash
  let targetTeachers = [...teachers];
  if (filters.teacherId && filters.teacherId !== 'all') {
    targetTeachers = targetTeachers.filter(
      (t) => String(t.id) === String(filters.teacherId)
    );
  }
  if (filters.branchId && filters.branchId !== 'all') {
    targetTeachers = targetTeachers.filter((t) => {
      const bId = t.branch_id || t.user?.branch_id || t.branch?.id;
      return String(bId) === String(filters.branchId);
    });
  }

  if (targetTeachers.length === 0) {
    throw new Error("Tanlangan parametrlar bo'yicha eksport qilish uchun o'qituvchilar topilmadi");
  }

  // 2. Kunlar ro'yxatini aniqlash
  let targetDays = [];
  if (filters.dateMode === 'range' && filters.startDate && filters.endDate) {
    targetDays = generateDaysBetween(filters.startDate, filters.endDate);
  } else if (filters.dateMode === 'single' && filters.singleDate) {
    targetDays = generateDaysBetween(filters.singleDate, filters.singleDate);
  } else if (monthDays && monthDays.length > 0) {
    targetDays = monthDays.map((d) => ({
      ...d,
      fullDayName: UZ_DAYS_FULL[d.dayOfWeek !== undefined ? d.dayOfWeek : (new Date(d.dateIso).getDay())],
    }));
  } else {
    // Generate default month days
    const totalDays = new Date(year, month, 0).getDate();
    targetDays = generateDaysBetween(
      `${year}-${String(month).padStart(2, '0')}-01`,
      `${year}-${String(month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`
    );
  }

  if (targetDays.length === 0) {
    throw new Error("Eksport qilinadigan sanalar oralig'i noto'g'ri");
  }

  // Yordamchi xarita: API dan kelgan qo'shimcha yozuvlar bo'lsa matritsaga qo'shish
  const combinedMatrix = { ...matrix };
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());

  if (Array.isArray(extraRecords)) {
    extraRecords.forEach((rec) => {
      if (rec.teacher_id && rec.date) {
        if (rec.date > todayStr) return; // Kelajakdagi kunlarni hisobga olmaslik
        const key = `${rec.teacher_id}_${rec.date}`;
        if (!combinedMatrix[key] || !combinedMatrix[key].isModified) {
          combinedMatrix[key] = {
            id: rec.id,
            status: rec.status,
            check_in: rec.check_in,
            check_out: rec.check_out,
            note: rec.note,
          };
        }
      }
    });
  }

  // Yordamchi: O'qituvchining biriktirilgan guruhlari nomlari
  const getTeacherGroups = (tId) => {
    if (!groups || !Array.isArray(groups)) return '—';
    const list = groups.filter((g) => String(g.teacher_id) === String(tId));
    if (list.length === 0) return '—';
    return list.map((g) => g.name || `Guruh #${g.id}`).join(', ');
  };

  // Yordamchi: Filial nomi
  const getBranchName = (teacher) => {
    if (teacher.branch?.name) return teacher.branch.name;
    const bId = teacher.branch_id || teacher.user?.branch_id;
    if (bId && Array.isArray(branches)) {
      const found = branches.find((b) => String(b.id) === String(bId));
      if (found) return found.name;
    }
    return "Asosiy Filial";
  };

  // =========================================================================
  // VARAQ 1: DAVOMAT (BATAFSIL RO'YXAT)
  // Har bir sana va o'qituvchi bo'yicha alohida qator - Excel AutoFilter uchun eng qulay format!
  // =========================================================================
  const detailedRows = [];
  let detailedRowIndex = 1;

  targetDays.forEach((day) => {
    targetTeachers.forEach((teacher) => {
      const key = `${teacher.id}_${day.dateIso}`;
      const rec = combinedMatrix[key] || {};
      const statusKey = (rec.status || '').toLowerCase().trim();

      // Agar status bo'yicha filter qo'yilgan bo'lsa
      if (filters.status && filters.status !== 'all') {
        if (statusKey !== filters.status.toLowerCase().trim()) {
          return; // Ushbu qatorni o'tkazib yuborish
        }
      }

      let statusText = "Belgilanmagan";
      let statusCode = "—";
      if (STATUS_META[statusKey]) {
        statusText = STATUS_META[statusKey].text;
        statusCode = STATUS_META[statusKey].code;
      } else if (day.isSunday) {
        statusText = "Dam olish kuni (Yakshanba)";
        statusCode = "Dam";
      }

      const fullName = teacher.user?.full_name || teacher.name || `O'qituvchi #${teacher.id}`;
      const phone = teacher.user?.phone || teacher.phone || '—';
      const spec = teacher.specialization || "O'qituvchi";
      const branchName = getBranchName(teacher);
      const groupsText = getTeacherGroups(teacher.id);

      const checkInTime = rec.check_in || (statusKey === 'present' || statusKey === 'late' ? '09:00' : '—');
      const checkOutTime = rec.check_out || (statusKey === 'present' ? '18:00' : '—');
      const penaltyAmount = statusKey === 'late' ? latePenaltyRate : 0;

      detailedRows.push({
        '№': detailedRowIndex++,
        'Sana': day.dateIso,
        'Hafta kuni': day.fullDayName || day.shortDayName,
        'O\'qituvchi (F.I.SH)': fullName,
        'Mutaxassislik': spec,
        'Filial': branchName,
        'Telefon raqami': phone,
        'Davomat Holati': statusText,
        'Holat Kodi': statusCode,
        'Kelgan Vaqti': checkInTime,
        'Ketgan Vaqti': checkOutTime,
        'Biriktirilgan Guruhlar': groupsText,
        'Izoh / Sabab': rec.note || '—',
        'Kechikish Jarimasi (so\'m)': penaltyAmount,
      });
    });
  });

  // =========================================================================
  // VARAQ 2: 1 OYLIK MATRITSA
  // Har bir o'qituvchi bo'yicha barcha kunlar katakchalari bilan (K, Y, KCH, S)
  // =========================================================================
  const workingDaysCount = targetDays.filter((d) => !d.isSunday && d.dateIso <= todayStr).length || 1;

  const matrixRows = targetTeachers.map((teacher, idx) => {
    const fullName = teacher.user?.full_name || teacher.name || `O'qituvchi #${teacher.id}`;
    const spec = teacher.specialization || "O'qituvchi";
    const branchName = getBranchName(teacher);
    const phone = teacher.user?.phone || teacher.phone || '—';

    let pCount = 0;
    let aCount = 0;
    let lCount = 0;
    let eCount = 0;

    const row = {
      '№': idx + 1,
      'O\'qituvchi (F.I.SH)': fullName,
      'Mutaxassislik': spec,
      'Filial': branchName,
      'Telefon': phone,
    };

    targetDays.forEach((d) => {
      const key = `${teacher.id}_${d.dateIso}`;
      const rec = combinedMatrix[key] || {};
      const s = (rec.status || '').toLowerCase().trim();

      let cellValue = '—';
      if (d.dateIso > todayStr) {
        cellValue = '—';
      } else if (s === 'present') {
        cellValue = 'K';
        pCount++;
      } else if (s === 'absent') {
        cellValue = 'Y';
        aCount++;
      } else if (s === 'late') {
        cellValue = 'KCH';
        lCount++;
      } else if (s === 'excused') {
        cellValue = 'S';
        eCount++;
      } else if (d.isSunday) {
        cellValue = 'Dam';
      }

      // Ustun nomi: masalan "01-Du", "02-Se", ...
      const colTitle = `${d.dayNumberPadded || String(d.dayNumber).padStart(2, '0')}-${d.shortDayName}`;
      row[colTitle] = cellValue;
    });

    const pct = Math.min(100, Math.round((pCount / workingDaysCount) * 100));

    row['Jami Keldi (K)'] = pCount;
    row['Jami Kelmadi (Y)'] = aCount;
    row['Jami Kechikdi (KCH)'] = lCount;
    row['Jami Sababli (S)'] = eCount;
    row['Davomat Foizi (%)'] = `${pct}%`;
    row['Intizom Bahosi'] =
      pct >= 90
        ? "A'lo"
        : pct >= 75
        ? "Yaxshi"
        : pct >= 60
        ? "Qoniqarli"
        : "Nazorat talab";

    return row;
  });

  // =========================================================================
  // VARAQ 3: OYLIK XULOSA VA MAOSH USHLANMALARI
  // =========================================================================
  const summaryRows = targetTeachers.map((teacher, idx) => {
    const fullName = teacher.user?.full_name || teacher.name || `O'qituvchi #${teacher.id}`;
    const spec = teacher.specialization || "O'qituvchi";
    const branchName = getBranchName(teacher);
    const phone = teacher.user?.phone || teacher.phone || '—';

    // Payroll info agar mavjud bo'lsa
    const pTeacher = payrollData?.teachers?.find(
      (pt) => String(pt.teacher_id) === String(teacher.id)
    );

    let pCount = 0;
    let aCount = 0;
    let lCount = 0;
    let eCount = 0;

    targetDays.forEach((d) => {
      const key = `${teacher.id}_${d.dateIso}`;
      const rec = combinedMatrix[key] || {};
      const s = (rec.status || '').toLowerCase().trim();
      if (s === 'present') pCount++;
      else if (s === 'absent') aCount++;
      else if (s === 'late') lCount++;
      else if (s === 'excused') eCount++;
    });

    const pct = Math.min(100, Math.round((pCount / workingDaysCount) * 100));
    const baseSalary = pTeacher?.base_salary || 4000000;
    const lateDeduction = pTeacher?.late_deduction !== undefined ? pTeacher.late_deduction : lCount * latePenaltyRate;
    const dailyRate = Math.round(baseSalary / workingDaysCount);
    const absenceDeduction = pTeacher?.absence_deduction !== undefined ? pTeacher.absence_deduction : aCount * dailyRate;
    const totalDeductions = lateDeduction + absenceDeduction;
    const netSalary = Math.max(0, baseSalary - totalDeductions);

    return {
      '№': idx + 1,
      'O\'qituvchi (F.I.SH)': fullName,
      'Filial': branchName,
      'Mutaxassislik': spec,
      'Telefon': phone,
      'Oy Ish Kunlari': workingDaysCount,
      'Kelgan Kunlar (K)': pCount,
      'Kelmagan Kunlar (Y)': aCount,
      'Kechikishlar (KCH)': lCount,
      'Sababli Qoldirilgan (S)': eCount,
      'Davomat Foizi (%)': `${pct}%`,
      'Intizom Holati':
        pct >= 90
          ? "A'lo"
          : pct >= 75
          ? "Yaxshi"
          : pct >= 60
          ? "Qoniqarli"
          : "Nazorat talab",
      'Asosiy Oylik (so\'m)': baseSalary,
      'Kechikish Jarimasi (so\'m)': lateDeduction,
      'Dars Qoldirish Jarimasi (so\'m)': absenceDeduction,
      'Jami Ushlanma (so\'m)': totalDeductions,
      'Sof To\'lanadigan Oylik (so\'m)': netSalary,
    };
  });

  // =========================================================================
  // WORKBOOK YARATISH VA AUTOFILTERLARNI SOZLASH
  // =========================================================================
  const workbook = XLSX.utils.book_new();
  let sheetsAppended = 0;

  // 1-VARAQ: Batafsil ro'yxat (AutoFilter bilan)
  if (sheetOptions.detailed && detailedRows.length > 0) {
    const wsDetailed = XLSX.utils.json_to_sheet(detailedRows);
    const colCount = Object.keys(detailedRows[0] || {}).length;
    const lastColLetter = getColLetter(colCount);

    // EXCEL AUTOFILTER SOZLAMASI: Har bir ustun sarlavhasida filtr strelkasi paydo bo'ladi
    wsDetailed['!autofilter'] = { ref: `A1:${lastColLetter}${detailedRows.length + 1}` };

    wsDetailed['!cols'] = [
      { wch: 6 },  // №
      { wch: 14 }, // Sana
      { wch: 15 }, // Hafta kuni
      { wch: 28 }, // O'qituvchi (F.I.SH)
      { wch: 22 }, // Mutaxassislik
      { wch: 20 }, // Filial
      { wch: 18 }, // Telefon raqami
      { wch: 18 }, // Davomat Holati
      { wch: 12 }, // Holat Kodi
      { wch: 14 }, // Kelgan Vaqti
      { wch: 14 }, // Ketgan Vaqti
      { wch: 28 }, // Biriktirilgan Guruhlar
      { wch: 32 }, // Izoh / Sabab
      { wch: 22 }, // Kechikish Jarimasi (so'm)
    ];

    XLSX.utils.book_append_sheet(workbook, wsDetailed, 'Davomat_Batafsil');
    sheetsAppended++;
  }

  // 2-VARAQ: 1 Oylik Matritsa (AutoFilter bilan)
  if (sheetOptions.matrix && matrixRows.length > 0) {
    const wsMatrix = XLSX.utils.json_to_sheet(matrixRows);
    const totalMatrixCols = Object.keys(matrixRows[0] || {}).length;
    const lastMatrixColLetter = getColLetter(totalMatrixCols);

    // EXCEL AUTOFILTER SOZLAMASI
    wsMatrix['!autofilter'] = { ref: `A1:${lastMatrixColLetter}${matrixRows.length + 1}` };

    const matrixColsWidths = [
      { wch: 6 },  // №
      { wch: 28 }, // O'qituvchi
      { wch: 22 }, // Mutaxassislik
      { wch: 20 }, // Filial
      { wch: 18 }, // Telefon
      ...targetDays.map(() => ({ wch: 7 })), // Kunlar
      { wch: 14 }, // Jami Keldi (K)
      { wch: 14 }, // Jami Kelmadi (Y)
      { wch: 16 }, // Jami Kechikdi (KCH)
      { wch: 14 }, // Jami Sababli (S)
      { wch: 16 }, // Davomat Foizi (%)
      { wch: 18 }, // Intizom Bahosi
    ];
    wsMatrix['!cols'] = matrixColsWidths;

    XLSX.utils.book_append_sheet(workbook, wsMatrix, 'Oylik_Matritsa');
    sheetsAppended++;
  }

  // 3-VARAQ: Oylik Xulosa va Maosh (AutoFilter bilan)
  if (sheetOptions.summary && summaryRows.length > 0) {
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    const totalSummaryCols = Object.keys(summaryRows[0] || {}).length;
    const lastSummaryColLetter = getColLetter(totalSummaryCols);

    // EXCEL AUTOFILTER SOZLAMASI
    wsSummary['!autofilter'] = { ref: `A1:${lastSummaryColLetter}${summaryRows.length + 1}` };

    wsSummary['!cols'] = [
      { wch: 6 },  // №
      { wch: 28 }, // O'qituvchi (F.I.SH)
      { wch: 20 }, // Filial
      { wch: 22 }, // Mutaxassislik
      { wch: 18 }, // Telefon
      { wch: 16 }, // Ish Kunlari Soni
      { wch: 15 }, // Kelgan Kunlar (K)
      { wch: 15 }, // Kelmagan Kunlar (Y)
      { wch: 16 }, // Kechikishlar (KCH)
      { wch: 16 }, // Sababli Qoldirilgan (S)
      { wch: 16 }, // Davomat Foizi (%)
      { wch: 18 }, // Intizom Bahosi
      { wch: 20 }, // Asosiy Oylik (so'm)
      { wch: 20 }, // Kechikish Jarimasi (so'm)
      { wch: 22 }, // Dars Qoldirish Jarimasi (so'm)
      { wch: 20 }, // Jami Ushlanma (so'm)
      { wch: 24 }, // Sof To'lanadigan Oylik (so'm)
    ];

    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Oylik_Xulosa_Maosh');
    sheetsAppended++;
  }

  if (sheetsAppended === 0) {
    throw new Error("Eksport qilish uchun kamida bitta varaq tanlangan bo'lishi va ma'lumot mavjud bo'lishi kerak");
  }

  // 4. Fayl nomini generatsiya qilish va yuklab berish
  const todayIso = new Date().toISOString().split('T')[0];
  let periodTag = `${year}_${String(month).padStart(2, '0')}`;
  if (filters.dateMode === 'range' && filters.startDate && filters.endDate) {
    periodTag = `${filters.startDate}_dan_${filters.endDate}_gacha`;
  } else if (filters.dateMode === 'single' && filters.singleDate) {
    periodTag = `${filters.singleDate}`;
  }

  const fileName = `oqituvchilar_davomati_${periodTag}_eksport_${todayIso}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  return {
    success: true,
    fileName,
    sheetsCount: sheetsAppended,
    totalRecords: detailedRows.length,
    totalTeachers: targetTeachers.length,
  };
};

export default exportTeacherAttendanceExcel;
