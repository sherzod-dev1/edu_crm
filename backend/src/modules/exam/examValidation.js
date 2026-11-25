// Exam ma'lumotlarini to'liq tekshirish (Validation)
exports.validateExam = (data) => {
    // 1. Imtihon nomi (title) tekshiruvi (Majburiy)
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
        return { error: { details: [{ message: "Imtihon nomi (title) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.title.trim().length > 150) {
        return { error: { details: [{ message: "Imtihon nomi 150 ta belgidan oshmasligi kerak" }] } };
    }

    // 2. course_id tekshiruvi (Ixtiyoriy)
    if (data.course_id !== undefined && data.course_id !== null && data.course_id !== '') {
        if (isNaN(data.course_id) || Number(data.course_id) <= 0) {
            return { error: { details: [{ message: "course_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 3. group_id tekshiruvi (Ixtiyoriy)
    if (data.group_id !== undefined && data.group_id !== null && data.group_id !== '') {
        if (isNaN(data.group_id) || Number(data.group_id) <= 0) {
            return { error: { details: [{ message: "group_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. module_id tekshiruvi (Ixtiyoriy)
    if (data.module_id !== undefined && data.module_id !== null && data.module_id !== '') {
        if (isNaN(data.module_id) || Number(data.module_id) <= 0) {
            return { error: { details: [{ message: "module_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 5. teacher_id tekshiruvi (Ixtiyoriy)
    if (data.teacher_id !== undefined && data.teacher_id !== null && data.teacher_id !== '') {
        if (isNaN(data.teacher_id) || Number(data.teacher_id) <= 0) {
            return { error: { details: [{ message: "teacher_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 6. exam_date tekshiruvi (Ixtiyoriy)
    if (data.exam_date && isNaN(Date.parse(data.exam_date))) {
        return { error: { details: [{ message: "Imtihon sanasi (exam_date) to'g'ri sana formatida (YYYY-MM-DD) bo'lishi kerak" }] } };
    }

    // 7. Ballar tekshiruvi (Ixtiyoriy)
    if (data.max_score !== undefined && data.max_score !== null && data.max_score !== '') {
        if (isNaN(data.max_score) || Number(data.max_score) <= 0) {
            return { error: { details: [{ message: "Maksimal ball (max_score) musbat son bo'lishi kerak" }] } };
        }
    }

    if (data.passing_score !== undefined && data.passing_score !== null && data.passing_score !== '') {
        if (isNaN(data.passing_score) || Number(data.passing_score) < 0) {
            return { error: { details: [{ message: "O'tish bali (passing_score) manfiy bo'lishi mumkin emas" }] } };
        }
    }

    // 8. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['planned', 'ongoing', 'completed', 'cancelled'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'planned', 'ongoing', 'completed' yoki 'cancelled' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
