// Toshkent vaqti bo'yicha bugungi ISO sanani olish (YYYY-MM-DD)
const getTodayTashkentIso = () => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
};

// Teacher Attendance validation logic
exports.validateTeacherAttendance = (data) => {
    // 1. teacher_id tekshiruvi (Majburiy)
    if (!data.teacher_id || isNaN(data.teacher_id) || Number(data.teacher_id) <= 0) {
        return { error: { details: [{ message: "teacher_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. date tekshiruvi (Majburiy, YYYY-MM-DD formati)
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.date).trim())) {
        return { error: { details: [{ message: "date kiritilishi shart va YYYY-MM-DD formatida bo'lishi kerak" }] } };
    }

    // 2.1. Kelajakdagi sana tekshiruvi (Kelajakdagi kunlar uchun davomat olish taqiqlangan)
    const trimmedDate = String(data.date).trim();
    const todayStr = getTodayTashkentIso();
    if (trimmedDate > todayStr) {
        return { error: { details: [{ message: `Kelajakdagi sana (${trimmedDate}) uchun davomat belgilab bo'lmaydi. Faqat bugungi (${todayStr}) va o'tgan kunlar uchun mumkin.` }] } };
    }

    // 3. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['present', 'absent', 'late', 'excused'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'present', 'absent', 'late' yoki 'excused' bo'lishi mumkin" }] } };
    }

    // 4. Eslatma (note) tekshiruvi (Ixtiyoriy)
    if (data.note && data.note.length > 255) {
        return { error: { details: [{ message: "Eslatma (note) 255 ta belgidan oshmasligi kerak" }] } };
    }

    // 5. marked_by tekshiruvi (Ixtiyoriy)
    if (data.marked_by !== undefined && data.marked_by !== null && data.marked_by !== '') {
        if (isNaN(data.marked_by) || Number(data.marked_by) <= 0) {
            return { error: { details: [{ message: "marked_by musbat butun son bo'lishi kerak" }] } };
        }
    }

    return { error: null };
};
