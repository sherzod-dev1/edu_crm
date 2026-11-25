// Course ma'lumotlarini to'liq tekshirish (Validation)
exports.validateCourse = (data) => {
    // 1. Kurs nomi tekshiruvi (Majburiy)
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        return { error: { details: [{ message: "Kurs nomi kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.name.trim().length > 150) {
        return { error: { details: [{ message: "Kurs nomi 150 ta belgidan oshmasligi kerak" }] } };
    }

    // 2. branch_id tekshiruvi (Ixtiyoriy)
    if (data.branch_id !== undefined && data.branch_id !== null && data.branch_id !== '') {
        if (isNaN(data.branch_id) || Number(data.branch_id) <= 0) {
            return { error: { details: [{ message: "branch_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // teacher_id tekshiruvi (Ixtiyoriy)
    if (data.teacher_id !== undefined && data.teacher_id !== null && data.teacher_id !== '') {
        if (isNaN(data.teacher_id) || Number(data.teacher_id) <= 0) {
            return { error: { details: [{ message: "teacher_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 3. Davomiyligi (duration_months) tekshiruvi (Ixtiyoriy)
    if (data.duration_months !== undefined && data.duration_months !== null && data.duration_months !== '') {
        if (isNaN(data.duration_months) || Number(data.duration_months) <= 0) {
            return { error: { details: [{ message: "Kurs davomiyligi (duration_months) musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. Narxi (price) tekshiruvi (Ixtiyoriy)
    if (data.price !== undefined && data.price !== null && data.price !== '') {
        if (isNaN(data.price) || Number(data.price) < 0) {
            return { error: { details: [{ message: "Kurs narxi (price) manfiy bo'lmasligi kerak" }] } };
        }
    }

    // 5. Darajasi (level) tekshiruvi (Ixtiyoriy)
    if (data.level && typeof data.level !== 'string') {
        return { error: { details: [{ message: "Kurs darajasi (level) matn formatida bo'lishi kerak" }] } };
    }

    // 6. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'inactive', 'draft'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active', 'inactive' yoki 'draft' bo'lishi mumkin" }] } };
    }

    // 7. Dars vaqti tekshiruvi (Ixtiyoriy)
    if (data.lesson_time && typeof data.lesson_time !== 'string') {
        return { error: { details: [{ message: "Dars vaqti (lesson_time) matn formatida bo'lishi kerak" }] } };
    }
    if (data.start_time && typeof data.start_time !== 'string') {
        return { error: { details: [{ message: "Boshlanish vaqti (start_time) matn formatida bo'lishi kerak" }] } };
    }
    if (data.days && typeof data.days !== 'string') {
        return { error: { details: [{ message: "Dars kunlari (days) matn formatida bo'lishi kerak" }] } };
    }

    return { error: null };
};
