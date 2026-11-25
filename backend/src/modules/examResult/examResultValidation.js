// ExamResult ma'lumotlarini to'liq tekshirish (Validation)
exports.validateExamResult = (data) => {
    // 1. exam_id tekshiruvi (Majburiy)
    if (!data.exam_id || isNaN(data.exam_id) || Number(data.exam_id) <= 0) {
        return { error: { details: [{ message: "exam_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. student_id tekshiruvi (Majburiy)
    if (!data.student_id || isNaN(data.student_id) || Number(data.student_id) <= 0) {
        return { error: { details: [{ message: "student_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 3. To'plangan ball (score) tekshiruvi (Majburiy)
    if (data.score === undefined || data.score === null || isNaN(data.score) || Number(data.score) < 0) {
        return { error: { details: [{ message: "To'plangan ball (score) kiritilishi shart va manfiy bo'lmasligi kerak" }] } };
    }

    // 4. Foiz (percentage) tekshiruvi (Ixtiyoriy)
    if (data.percentage !== undefined && data.percentage !== null && data.percentage !== '') {
        if (isNaN(data.percentage) || Number(data.percentage) < 0 || Number(data.percentage) > 100) {
            return { error: { details: [{ message: "Foiz (percentage) 0 va 100 oralig'ida bo'lishi kerak" }] } };
        }
    }

    // 5. Baho (grade) tekshiruvi (Ixtiyoriy)
    if (data.grade && data.grade.length > 10) {
        return { error: { details: [{ message: "Baho (grade) 10 ta belgidan oshmasligi kerak" }] } };
    }

    // 6. created_by tekshiruvi (Ixtiyoriy)
    if (data.created_by !== undefined && data.created_by !== null && data.created_by !== '') {
        if (isNaN(data.created_by) || Number(data.created_by) <= 0) {
            return { error: { details: [{ message: "created_by musbat butun son bo'lishi kerak" }] } };
        }
    }

    return { error: null };
};
