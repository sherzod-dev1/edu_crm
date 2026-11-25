// Branch ma'lumotlarini to'liq tekshirish (Validation)
exports.validateBranch = (data) => {
    // 1. Nomi tekshiruvi (Majburiy)
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        return { error: { details: [{ message: "Filial nomi kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
    }
    if (data.name.trim().length > 150) {
        return { error: { details: [{ message: "Filial nomi 150 ta belgidan oshmasligi kerak" }] } };
    }

    // 2. Email tekshiruvi (Ixtiyoriy, lekin kiritilgan bo'lsa to'g'ri email bo'lishi kerak)
    if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { error: { details: [{ message: "To'g'ri email formatini kiriting" }] } };
        }
    }

    // 3. Telefon raqami tekshiruvi (Ixtiyoriy)
    if (data.phone && typeof data.phone !== 'string') {
        return { error: { details: [{ message: "Telefon raqami matn formatida bo'lishi kerak" }] } };
    }

    // 4. Manzil tekshiruvi (Ixtiyoriy)
    if (data.address && typeof data.address !== 'string') {
        return { error: { details: [{ message: "Manzil matn formatida bo'lishi kerak" }] } };
    }

    // 5. Manager ID tekshiruvi (Ixtiyoriy, butun son bo'lishi kerak)
    if (data.manager_id !== undefined && data.manager_id !== null) {
        if (isNaN(data.manager_id) || Number(data.manager_id) <= 0) {
            return { error: { details: [{ message: "Manager ID musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 6. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'inactive'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active' yoki 'inactive' bo'lishi mumkin" }] } };
    }

    return { error: null };
};

