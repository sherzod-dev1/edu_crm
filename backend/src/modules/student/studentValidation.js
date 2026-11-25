// Student ma'lumotlarini to'liq tekshirish (Validation)
exports.validateStudent = (data, isUpdate = false) => {
    // 1. user_id tekshiruvi (Create da Majburiy, Update da Ixtiyoriy)
    if (!isUpdate || data.user_id !== undefined) {
        if (!data.user_id || isNaN(data.user_id) || Number(data.user_id) <= 0) {
            return { error: { details: [{ message: "user_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 2. branch_id tekshiruvi (Ixtiyoriy)
    if (data.branch_id !== undefined && data.branch_id !== null && data.branch_id !== '') {
        if (isNaN(data.branch_id) || Number(data.branch_id) <= 0) {
            return { error: { details: [{ message: "branch_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 2.1 group_id tekshiruvi (Ixtiyoriy)
    if (data.group_id !== undefined && data.group_id !== null && data.group_id !== '') {
        if (isNaN(data.group_id) || Number(data.group_id) <= 0) {
            return { error: { details: [{ message: "group_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 2.2 course_id tekshiruvi (Ixtiyoriy)
    if (data.course_id !== undefined && data.course_id !== null && data.course_id !== '') {
        if (isNaN(data.course_id) || Number(data.course_id) <= 0) {
            return { error: { details: [{ message: "course_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 3. Tug'ilgan sana (birth_date) tekshiruvi (Ixtiyoriy)
    if (data.birth_date && isNaN(Date.parse(data.birth_date))) {
        return { error: { details: [{ message: "birth_date to'g'ri sana formatida bo'lishi kerak (YYYY-MM-DD)" }] } };
    }

    // 4. Jinsi (gender) tekshiruvi (Ixtiyoriy)
    if (data.gender && typeof data.gender !== 'string') {
        return { error: { details: [{ message: "Jinsi (gender) matn formatida bo'lishi kerak" }] } };
    }

    // 5. Manzil tekshiruvi (Ixtiyoriy)
    if (data.address && typeof data.address !== 'string') {
        return { error: { details: [{ message: "Manzil matn formatida bo'lishi kerak" }] } };
    }

    // 6. Ota-onasi ismi (parent_name) tekshiruvi (Ixtiyoriy)
    if (data.parent_name && typeof data.parent_name !== 'string') {
        return { error: { details: [{ message: "Ota-onasi ismi matn formatida bo'lishi kerak" }] } };
    }

    // 7. Ota-onasi telefoni (parent_phone) tekshiruvi (Ixtiyoriy)
    if (data.parent_phone && typeof data.parent_phone !== 'string') {
        return { error: { details: [{ message: "Ota-onasi telefoni matn formatida bo'lishi kerak" }] } };
    }

    // 8. Ta'lim darajasi (education) tekshiruvi (Ixtiyoriy)
    if (data.education && typeof data.education !== 'string') {
        return { error: { details: [{ message: "Ta'lim ma'lumoti matn formatida bo'lishi kerak" }] } };
    }

    // 9. Status tekshiruvi (Ixtiyoriy)
    const allowedStatuses = ['active', 'inactive', 'graduated', 'dropped', 'debt', 'blocked', 'frozen', 'left', "o'qiyabdi", 'bitirgan', 'ketgan', 'muzlatilgan'];
    if (data.status && !allowedStatuses.includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: `Status quyidagilardan biri bo'lishi kerak: ${allowedStatuses.join(', ')}` }] } };
    }

    // 10. Qo'shilgan sana (joined_at) tekshiruvi (Ixtiyoriy)
    if (data.joined_at && isNaN(Date.parse(data.joined_at))) {
        return { error: { details: [{ message: "joined_at to'g'ri sana formatida bo'lishi kerak (YYYY-MM-DD)" }] } };
    }

    return { error: null };
};
