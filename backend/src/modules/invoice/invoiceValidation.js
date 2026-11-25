// Invoice ma'lumotlarini to'liq tekshirish (Validation)
exports.validateInvoice = (data) => {
    // 1. student_id tekshiruvi (Majburiy)
    if (!data.student_id || isNaN(data.student_id) || Number(data.student_id) <= 0) {
        return { error: { details: [{ message: "student_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. Summa (amount) tekshiruvi (Majburiy)
    if (data.amount === undefined || data.amount === null || isNaN(data.amount) || Number(data.amount) <= 0) {
        return { error: { details: [{ message: "Hisob-faktura summasi (amount) musbat son bo'lishi shart" }] } };
    }

    // 3. group_id tekshiruvi (Ixtiyoriy)
    if (data.group_id !== undefined && data.group_id !== null && data.group_id !== '') {
        if (isNaN(data.group_id) || Number(data.group_id) <= 0) {
            return { error: { details: [{ message: "group_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. paid_amount tekshiruvi (Ixtiyoriy)
    if (data.paid_amount !== undefined && data.paid_amount !== null && data.paid_amount !== '') {
        if (isNaN(data.paid_amount) || Number(data.paid_amount) < 0) {
            return { error: { details: [{ message: "To'langan summa (paid_amount) manfiy bo'lishi mumkin emas" }] } };
        }
    }

    // 5. due_amount tekshiruvi (Ixtiyoriy)
    if (data.due_amount !== undefined && data.due_amount !== null && data.due_amount !== '') {
        if (isNaN(data.due_amount) || Number(data.due_amount) < 0) {
            return { error: { details: [{ message: "Qarzdorlik summasi (due_amount) manfiy bo'lishi mumkin emas" }] } };
        }
    }

    // 6. due_date tekshiruvi (Ixtiyoriy)
    if (data.due_date && isNaN(Date.parse(data.due_date))) {
        return { error: { details: [{ message: "To'lov muddati (due_date) to'g'ri sana formatida (YYYY-MM-DD) bo'lishi kerak" }] } };
    }

    // 7. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['unpaid', 'partially_paid', 'paid', 'cancelled', 'overdue'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'unpaid', 'partially_paid', 'paid', 'cancelled' yoki 'overdue' bo'lishi mumkin" }] } };
    }

    // 8. created_by tekshiruvi (Ixtiyoriy)
    if (data.created_by !== undefined && data.created_by !== null && data.created_by !== '') {
        if (isNaN(data.created_by) || Number(data.created_by) <= 0) {
            return { error: { details: [{ message: "created_by musbat butun son bo'lishi kerak" }] } };
        }
    }

    return { error: null };
};
