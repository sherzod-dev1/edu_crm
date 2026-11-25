// PaymentMethod ma'lumotlarini to'liq tekshirish (Validation)
exports.validatePaymentMethod = (data) => {
    // 1. To'lov turi nomi (name) tekshiruvi (Majburiy)
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        return { error: { details: [{ message: "To'lov turi nomi (name) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.name.trim().length > 50) {
        return { error: { details: [{ message: "To'lov turi nomi 50 ta belgidan oshmasligi kerak" }] } };
    }

    // 2. To'lov turi kodi (code) tekshiruvi (Majburiy)
    if (!data.code || typeof data.code !== 'string' || data.code.trim().length < 2) {
        return { error: { details: [{ message: "To'lov turi kodi (code) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.code.trim().length > 30) {
        return { error: { details: [{ message: "To'lov turi kodi 30 ta belgidan oshmasligi kerak" }] } };
    }

    // 3. Tavsif (description) tekshiruvi (Ixtiyoriy)
    if (data.description && data.description.length > 255) {
        return { error: { details: [{ message: "Tavsif (description) 255 ta belgidan oshmasligi kerak" }] } };
    }

    // 4. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'inactive'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active' yoki 'inactive' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
