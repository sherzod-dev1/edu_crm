// Activity ma'lumotlarini to'liq tekshirish (Validation)
exports.validateActivity = (data) => {
    // 1. Amaliyot (action) tekshiruvi (Majburiy)
    if (!data.action || typeof data.action !== 'string' || data.action.trim().length < 2) {
        return { error: { details: [{ message: "Amaliyot nomi (action) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.action.trim().length > 50) {
        return { error: { details: [{ message: "action 50 ta belgidan oshmasligi kerak" }] } };
    }

    // 2. user_id tekshiruvi (Ixtiyoriy)
    if (data.user_id !== undefined && data.user_id !== null && data.user_id !== '') {
        if (isNaN(data.user_id) || Number(data.user_id) <= 0) {
            return { error: { details: [{ message: "user_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 3. entity_type tekshiruvi (Ixtiyoriy)
    if (data.entity_type !== undefined && data.entity_type !== null && (typeof data.entity_type !== 'string' || data.entity_type.trim().length > 50)) {
        return { error: { details: [{ message: "entity_type matn ko'rinishida bo'lishi va 50 ta belgidan oshmasligi kerak" }] } };
    }

    // 4. entity_id tekshiruvi (Ixtiyoriy)
    if (data.entity_id !== undefined && data.entity_id !== null && data.entity_id !== '') {
        if (isNaN(data.entity_id) || Number(data.entity_id) <= 0) {
            return { error: { details: [{ message: "entity_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 5. ip_address tekshiruvi (Ixtiyoriy)
    if (data.ip_address !== undefined && data.ip_address !== null && typeof data.ip_address !== 'string') {
        return { error: { details: [{ message: "ip_address matn formatida bo'lishi kerak" }] } };
    }

    return { error: null };
};
