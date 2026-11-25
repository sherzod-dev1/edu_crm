// Certificate ma'lumotlarini to'liq tekshirish (Validation)
exports.validateCertificate = (data) => {
    // 1. student_id tekshiruvi (Majburiy)
    if (!data.student_id || isNaN(data.student_id) || Number(data.student_id) <= 0) {
        return { error: { details: [{ message: "student_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. course_id tekshiruvi (Majburiy)
    if (!data.course_id || isNaN(data.course_id) || Number(data.course_id) <= 0) {
        return { error: { details: [{ message: "course_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 3. Sertifikat sarlavhasi (title) tekshiruvi (Majburiy)
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
        return { error: { details: [{ message: "Sertifikat sarlavhasi (title) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.title.trim().length > 150) {
        return { error: { details: [{ message: "Sertifikat sarlavhasi 150 ta belgidan oshmasligi kerak" }] } };
    }

    // 4. Berilgan sana (issue_date) tekshiruvi (Ixtiyoriy)
    if (data.issue_date && isNaN(Date.parse(data.issue_date))) {
        return { error: { details: [{ message: "Berilgan sana (issue_date) to'g'ri sana formatida (YYYY-MM-DD) bo'lishi kerak" }] } };
    }

    // 5. Amal qilish muddati (expiry_date) tekshiruvi (Ixtiyoriy)
    if (data.expiry_date && isNaN(Date.parse(data.expiry_date))) {
        return { error: { details: [{ message: "Amal qilish muddati (expiry_date) to'g'ri sana formatida (YYYY-MM-DD) bo'lishi kerak" }] } };
    }

    // 6. created_by tekshiruvi (Ixtiyoriy)
    if (data.created_by !== undefined && data.created_by !== null && data.created_by !== '') {
        if (isNaN(data.created_by) || Number(data.created_by) <= 0) {
            return { error: { details: [{ message: "created_by musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 7. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'revoked', 'expired'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active', 'revoked' yoki 'expired' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
