// Group ma'lumotlarini to'liq tekshirish (Validation)
exports.validateGroup = (data) => {
    // 1. Guruh nomi tekshiruvi (Ixtiyoriy)
    if (data.name && typeof data.name !== 'string') {
        return { error: { details: [{ message: "Guruh nomi matn bo'lishi kerak" }] } };
    }
    if (data.name && data.name.trim().length > 100) {
        return { error: { details: [{ message: "Guruh nomi 100 ta belgidan oshmasligi kerak" }] } };
    }

    // 2. course_id tekshiruvi (Majburiy)
    if (!data.course_id || isNaN(data.course_id) || Number(data.course_id) <= 0) {
        return { error: { details: [{ message: "course_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 3. teacher_id tekshiruvi (Ixtiyoriy)
    if (data.teacher_id !== undefined && data.teacher_id !== null && data.teacher_id !== '') {
        if (isNaN(data.teacher_id) || Number(data.teacher_id) <= 0) {
            return { error: { details: [{ message: "teacher_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. branch_id tekshiruvi (Ixtiyoriy)
    if (data.branch_id !== undefined && data.branch_id !== null && data.branch_id !== '') {
        if (isNaN(data.branch_id) || Number(data.branch_id) <= 0) {
            return { error: { details: [{ message: "branch_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 5. Sig'im (capacity) tekshiruvi (Ixtiyoriy)
    if (data.capacity !== undefined && data.capacity !== null && data.capacity !== '') {
        if (isNaN(data.capacity) || Number(data.capacity) <= 0) {
            return { error: { details: [{ message: "Guruh sig'imi (capacity) musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 6. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'planned', 'completed', 'cancelled', 'inactive'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active', 'planned', 'completed', 'cancelled' yoki 'inactive' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
