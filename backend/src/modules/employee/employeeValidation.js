// Employee ma'lumotlarini to'liq tekshirish (Validation)
exports.validateEmployee = (data) => {
    // 1. user_id tekshiruvi (Majburiy)
    if (!data.user_id || isNaN(data.user_id) || Number(data.user_id) <= 0) {
        return { error: { details: [{ message: "user_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. Lavozim tekshiruvi (Majburiy)
    if (!data.position || typeof data.position !== 'string' || data.position.trim().length < 2) {
        return { error: { details: [{ message: "Lavozim (position) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.position.trim().length > 100) {
        return { error: { details: [{ message: "Lavozim 100 ta belgidan oshmasligi kerak" }] } };
    }

    // 3. branch_id tekshiruvi (Ixtiyoriy)
    if (data.branch_id !== undefined && data.branch_id !== null && data.branch_id !== '') {
        if (isNaN(data.branch_id) || Number(data.branch_id) <= 0) {
            return { error: { details: [{ message: "branch_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. Ish haqi tekshiruvi (Ixtiyoriy)
    if (data.salary !== undefined && data.salary !== null && data.salary !== '') {
        if (isNaN(data.salary) || Number(data.salary) < 0) {
            return { error: { details: [{ message: "Maosh (salary) manfiy bo'lmasligi kerak" }] } };
        }
    }

    // 5. Ishga kirgan sana tekshiruvi (Ixtiyoriy)
    if (data.hire_date && isNaN(Date.parse(data.hire_date))) {
        return { error: { details: [{ message: "hire_date to'g'ri sana formatida bo'lishi kerak (YYYY-MM-DD)" }] } };
    }

    // 6. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'inactive', 'on_leave'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active', 'inactive' yoki 'on_leave' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
