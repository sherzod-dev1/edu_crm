// CourseModule ma'lumotlarini to'liq tekshirish (Validation)
exports.validateCourseModule = (data) => {
    // 1. course_id tekshiruvi (Majburiy)
    if (!data.course_id || isNaN(data.course_id) || Number(data.course_id) <= 0) {
        return { error: { details: [{ message: "course_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. Modul sarlavhasi (title) tekshiruvi (Majburiy)
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
        return { error: { details: [{ message: "Modul sarlavhasi (title) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.title.trim().length > 150) {
        return { error: { details: [{ message: "Modul sarlavhasi 150 ta belgidan oshmasligi kerak" }] } };
    }

    // 3. Modul tartib raqami (order_number) tekshiruvi (Ixtiyoriy)
    if (data.order_number !== undefined && data.order_number !== null && data.order_number !== '') {
        if (isNaN(data.order_number) || Number(data.order_number) < 0) {
            return { error: { details: [{ message: "order_number musbat son yoki 0 bo'lishi kerak" }] } };
        }
    }

    // 4. Davomiyligi soatlarda (duration_hours) tekshiruvi (Ixtiyoriy)
    if (data.duration_hours !== undefined && data.duration_hours !== null && data.duration_hours !== '') {
        if (isNaN(data.duration_hours) || Number(data.duration_hours) < 0) {
            return { error: { details: [{ message: "duration_hours musbat son yoki 0 bo'lishi kerak" }] } };
        }
    }

    // 5. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'inactive', 'draft'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active', 'inactive' yoki 'draft' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
