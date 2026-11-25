// TrialLesson ma'lumotlarini to'liq tekshirish (Validation)
exports.validateTrialLesson = (data) => {
    // 1. lead_id tekshiruvi (Majburiy)
    if (!data.lead_id || isNaN(data.lead_id) || Number(data.lead_id) <= 0) {
        return { error: { details: [{ message: "lead_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. course_id tekshiruvi (Majburiy)
    if (!data.course_id || isNaN(data.course_id) || Number(data.course_id) <= 0) {
        return { error: { details: [{ message: "course_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 3. trial_date tekshiruvi (Majburiy)
    if (!data.trial_date || isNaN(Date.parse(data.trial_date))) {
        return { error: { details: [{ message: "Sinov darsi sanasi (trial_date) to'g'ri sana formatida (YYYY-MM-DD) kiritilishi shart" }] } };
    }

    // 4. teacher_id tekshiruvi (Ixtiyoriy)
    if (data.teacher_id !== undefined && data.teacher_id !== null && data.teacher_id !== '') {
        if (isNaN(data.teacher_id) || Number(data.teacher_id) <= 0) {
            return { error: { details: [{ message: "teacher_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 5. branch_id tekshiruvi (Ixtiyoriy)
    if (data.branch_id !== undefined && data.branch_id !== null && data.branch_id !== '') {
        if (isNaN(data.branch_id) || Number(data.branch_id) <= 0) {
            return { error: { details: [{ message: "branch_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 6. classroom_id tekshiruvi (Ixtiyoriy)
    if (data.classroom_id !== undefined && data.classroom_id !== null && data.classroom_id !== '') {
        if (isNaN(data.classroom_id) || Number(data.classroom_id) <= 0) {
            return { error: { details: [{ message: "classroom_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 7. created_by tekshiruvi (Ixtiyoriy)
    if (data.created_by !== undefined && data.created_by !== null && data.created_by !== '') {
        if (isNaN(data.created_by) || Number(data.created_by) <= 0) {
            return { error: { details: [{ message: "created_by musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 8. Vaqt tekshiruvi (start_time, end_time - Ixtiyoriy)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (data.start_time && !timeRegex.test(data.start_time)) {
        return { error: { details: [{ message: "start_time to'g'ri vaqt formatida (HH:MM yoki HH:MM:SS) bo'lishi kerak" }] } };
    }
    if (data.end_time && !timeRegex.test(data.end_time)) {
        return { error: { details: [{ message: "end_time to'g'ri vaqt formatida (HH:MM yoki HH:MM:SS) bo'lishi kerak" }] } };
    }

    // 9. Status tekshiruvi (Ixtiyoriy)
    if (data.status && typeof data.status !== 'string') {
        return { error: { details: [{ message: "status matn formatida bo'lishi kerak" }] } };
    }

    return { error: null };
};
