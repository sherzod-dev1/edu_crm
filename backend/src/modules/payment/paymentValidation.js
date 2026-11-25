// Payment ma'lumotlarini to'liq tekshirish (Validation)
exports.validatePayment = (data) => {
    // 1. student_id tekshiruvi (Majburiy)
    if (!data.student_id || isNaN(data.student_id) || Number(data.student_id) <= 0) {
        return { error: { details: [{ message: "student_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. To'lov summasi (amount) tekshiruvi (Majburiy)
    if (data.amount === undefined || data.amount === null || isNaN(data.amount) || Number(data.amount) <= 0) {
        return { error: { details: [{ message: "To'lov summasi (amount) musbat son bo'lishi shart" }] } };
    }

    // 3. invoice_id tekshiruvi (Ixtiyoriy)
    if (data.invoice_id !== undefined && data.invoice_id !== null && data.invoice_id !== '') {
        if (isNaN(data.invoice_id) || Number(data.invoice_id) <= 0) {
            return { error: { details: [{ message: "invoice_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. payment_method_id tekshiruvi (Ixtiyoriy)
    if (data.payment_method_id !== undefined && data.payment_method_id !== null && data.payment_method_id !== '') {
        if (isNaN(data.payment_method_id) || Number(data.payment_method_id) <= 0) {
            return { error: { details: [{ message: "payment_method_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 5. created_by tekshiruvi (Ixtiyoriy)
    if (data.created_by !== undefined && data.created_by !== null && data.created_by !== '') {
        if (isNaN(data.created_by) || Number(data.created_by) <= 0) {
            return { error: { details: [{ message: "created_by musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 6. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['completed', 'pending', 'failed', 'refunded', 'cancelled'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'completed', 'pending', 'failed', 'refunded' yoki 'cancelled' bo'lishi mumkin" }] } };
    }

    // 7. note tekshiruvi (Ixtiyoriy)
    if (data.note && data.note.length > 255) {
        return { error: { details: [{ message: "Eslatma (note) 255 ta belgidan oshmasligi kerak" }] } };
    }

    return { error: null };
};
