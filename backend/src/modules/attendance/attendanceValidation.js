// Attendance ma'lumotlarini to'liq tekshirish (Validation)
exports.validateAttendance = (data) => {
    // 1. lesson_id tekshiruvi (Majburiy)
    if (!data.lesson_id || isNaN(data.lesson_id) || Number(data.lesson_id) <= 0) {
        return { error: { details: [{ message: "lesson_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. student_id tekshiruvi (Majburiy)
    if (!data.student_id || isNaN(data.student_id) || Number(data.student_id) <= 0) {
        return { error: { details: [{ message: "student_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
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
