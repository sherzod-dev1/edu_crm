// Lesson ma'lumotlarini to'liq tekshirish (Validation)
exports.validateLesson = (data) => {
    // 1. group_id tekshiruvi (Majburiy)
    if (!data.group_id || isNaN(data.group_id) || Number(data.group_id) <= 0) {
        return { error: { details: [{ message: "group_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. lesson_date tekshiruvi (Majburiy)
    if (!data.lesson_date || isNaN(Date.parse(data.lesson_date))) {
        return { error: { details: [{ message: "Dars sanasi (lesson_date) to'g'ri sana formatida (YYYY-MM-DD) bo'lishi shart" }] } };
    }
    const [ly, lm, ld] = String(data.lesson_date).split('-').map(Number);
    if (ly && lm && ld) {
        const lessonDateObj = new Date(ly, lm - 1, ld);
        if (lessonDateObj.getDay() === 0) {
            return { error: { details: [{ message: "Yakshanba dam olish kuni! Yakshanba kuniga dars qo'yish mumkin emas." }] } };
        }
    }

    // 3. teacher_id tekshiruvi (Ixtiyoriy)
    if (data.teacher_id !== undefined && data.teacher_id !== null && data.teacher_id !== '') {
        if (isNaN(data.teacher_id) || Number(data.teacher_id) <= 0) {
            return { error: { details: [{ message: "teacher_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. classroom_id tekshiruvi (Ixtiyoriy)
    if (data.classroom_id !== undefined && data.classroom_id !== null && data.classroom_id !== '') {
        if (isNaN(data.classroom_id) || Number(data.classroom_id) <= 0) {
            return { error: { details: [{ message: "classroom_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 5. module_id tekshiruvi (Ixtiyoriy)
    if (data.module_id !== undefined && data.module_id !== null && data.module_id !== '') {
        if (isNaN(data.module_id) || Number(data.module_id) <= 0) {
            return { error: { details: [{ message: "module_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 6. Mavzu (topic) tekshiruvi (Ixtiyoriy)
    if (data.topic && data.topic.length > 255) {
        return { error: { details: [{ message: "Dars mavzusi (topic) 255 ta belgidan oshmasligi kerak" }] } };
    }

    // 7. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['planned', 'completed', 'cancelled', 'in_progress'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'planned', 'completed', 'cancelled' yoki 'in_progress' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
