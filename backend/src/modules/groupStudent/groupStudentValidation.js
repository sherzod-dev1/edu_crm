// GroupStudent ma'lumotlarini to'liq tekshirish (Validation)
exports.validateGroupStudent = (data) => {
    // 1. group_id tekshiruvi (Majburiy)
    if (!data.group_id || isNaN(data.group_id) || Number(data.group_id) <= 0) {
        return { error: { details: [{ message: "group_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. student_id tekshiruvi (Majburiy)
    if (!data.student_id || isNaN(data.student_id) || Number(data.student_id) <= 0) {
        return { error: { details: [{ message: "student_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 3. joined_at tekshiruvi (Ixtiyoriy)
    if (data.joined_at && isNaN(Date.parse(data.joined_at))) {
        return { error: { details: [{ message: "joined_at to'g'ri sana formatida (YYYY-MM-DD) bo'lishi kerak" }] } };
    }

    // 4. left_at tekshiruvi (Ixtiyoriy)
    if (data.left_at && isNaN(Date.parse(data.left_at))) {
        return { error: { details: [{ message: "left_at to'g'ri sana formatida (YYYY-MM-DD) bo'lishi kerak" }] } };
    }

    // 5. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'left', 'frozen', 'graduated', 'inactive'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active', 'left', 'frozen', 'graduated' yoki 'inactive' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
