// Lead ma'lumotlarini to'liq tekshirish (Validation)
exports.validateLead = (data) => {
    // 1. Ism-familiya (full_name) tekshiruvi (Majburiy)
    if (!data.full_name || typeof data.full_name !== 'string' || data.full_name.trim().length < 2) {
        return { error: { details: [{ message: "Lidning to'liq ismi (full_name) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.full_name.trim().length > 150) {
        return { error: { details: [{ message: "Ism-familiya 150 ta belgidan oshmasligi kerak" }] } };
    }

    // 2. Telefon raqam (phone) tekshiruvi (Majburiy)
    if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length < 7) {
        return { error: { details: [{ message: "Telefon raqam kiritilishi shart va to'g'ri formatda bo'lishi kerak" }] } };
    }
    if (data.phone.trim().length > 20) {
        return { error: { details: [{ message: "Telefon raqam 20 ta belgidan oshmasligi kerak" }] } };
    }

    // 3. branch_id tekshiruvi (Ixtiyoriy)
    if (data.branch_id !== undefined && data.branch_id !== null && data.branch_id !== '') {
        if (isNaN(data.branch_id) || Number(data.branch_id) <= 0) {
            return { error: { details: [{ message: "branch_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. assigned_to tekshiruvi (Ixtiyoriy)
    if (data.assigned_to !== undefined && data.assigned_to !== null && data.assigned_to !== '') {
        if (isNaN(data.assigned_to) || Number(data.assigned_to) <= 0) {
            return { error: { details: [{ message: "assigned_to musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 5. interested_course_id tekshiruvi (Ixtiyoriy)
    if (data.interested_course_id !== undefined && data.interested_course_id !== null && data.interested_course_id !== '') {
        if (isNaN(data.interested_course_id) || Number(data.interested_course_id) <= 0) {
            return { error: { details: [{ message: "interested_course_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 6. Email tekshiruvi (Ixtiyoriy)
    if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { error: { details: [{ message: "Email formati noto'g'ri kiritildi" }] } };
        }
        if (data.email.length > 150) {
            return { error: { details: [{ message: "Email 150 ta belgidan oshmasligi kerak" }] } };
        }
    }

    // 7. Sanalar tekshiruvi (Ixtiyoriy)
    if (data.next_follow_up && isNaN(Date.parse(data.next_follow_up))) {
        return { error: { details: [{ message: "next_follow_up to'g'ri sana/vaqt formatida bo'lishi kerak" }] } };
    }
    if (data.converted_at && isNaN(Date.parse(data.converted_at))) {
        return { error: { details: [{ message: "converted_at to'g'ri sana/vaqt formatida bo'lishi kerak" }] } };
    }

    // 8. Status tekshiruvi (Ixtiyoriy)
    if (data.status && typeof data.status !== 'string') {
        return { error: { details: [{ message: "status matn formatida bo'lishi kerak" }] } };
    }

    return { error: null };
};
