// Notification ma'lumotlarini to'liq tekshirish (Validation)
exports.validateNotification = (data) => {
    // 1. user_id tekshiruvi (Majburiy)
    if (!data.user_id || isNaN(data.user_id) || Number(data.user_id) <= 0) {
        return { error: { details: [{ message: "user_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. title tekshiruvi (Majburiy)
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
        return { error: { details: [{ message: "Xabarnoma sarlavhasi (title) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.title.trim().length > 200) {
        return { error: { details: [{ message: "Xabarnoma sarlavhasi 200 ta belgidan oshmasligi kerak" }] } };
    }

    // 3. message tekshiruvi (Majburiy)
    if (!data.message || typeof data.message !== 'string' || data.message.trim().length < 1) {
        return { error: { details: [{ message: "Xabarnoma matni (message) kiritilishi shart" }] } };
    }

    // 4. type tekshiruvi (Ixtiyoriy)
    if (data.type !== undefined && data.type !== null && (typeof data.type !== 'string' || data.type.trim().length > 50)) {
        return { error: { details: [{ message: "type matn ko'rinishida bo'lishi va 50 ta belgidan oshmasligi kerak" }] } };
    }

    // 5. is_read tekshiruvi (Ixtiyoriy)
    if (data.is_read !== undefined && typeof data.is_read !== 'boolean') {
        return { error: { details: [{ message: "is_read mantiqiy (boolean - true/false) qiymat bo'lishi kerak" }] } };
    }

    // 6. read_at tekshiruvi (Ixtiyoriy)
    if (data.read_at && isNaN(Date.parse(data.read_at))) {
        return { error: { details: [{ message: "read_at to'g'ri sana/vaqt formatida bo'lishi kerak" }] } };
    }

    return { error: null };
};
