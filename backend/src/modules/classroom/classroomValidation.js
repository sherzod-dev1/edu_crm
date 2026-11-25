// Classroom ma'lumotlarini to'liq tekshirish (Validation)
exports.validateClassroom = (data) => {
    // 1. Xona nomi tekshiruvi (Majburiy)
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 1) {
        return { error: { details: [{ message: "Xona nomi (name) kiritilishi shart" }] } };
    }
    if (data.name.trim().length > 100) {
        return { error: { details: [{ message: "Xona nomi 100 ta belgidan oshmasligi kerak" }] } };
    }

    // 2. branch_id tekshiruvi (Ixtiyoriy)
    if (data.branch_id !== undefined && data.branch_id !== null && data.branch_id !== '') {
        if (isNaN(data.branch_id) || Number(data.branch_id) <= 0) {
            return { error: { details: [{ message: "branch_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 3. Qavat (floor) tekshiruvi (Ixtiyoriy)
    if (data.floor !== undefined && data.floor !== null && data.floor !== '') {
        if (isNaN(data.floor)) {
            return { error: { details: [{ message: "Qavat (floor) son bo'lishi kerak" }] } };
        }
    }

    // 4. Sig'im (capacity) tekshiruvi (Ixtiyoriy)
    if (data.capacity !== undefined && data.capacity !== null && data.capacity !== '') {
        if (isNaN(data.capacity) || Number(data.capacity) <= 0) {
            return { error: { details: [{ message: "Sig'im (capacity) musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 5. Xona turi (room_type) tekshiruvi (Ixtiyoriy)
    if (data.room_type && typeof data.room_type !== 'string') {
        return { error: { details: [{ message: "Xona turi (room_type) matn formatida bo'lishi kerak" }] } };
    }

    // 6. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'inactive', 'maintenance'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active', 'inactive' yoki 'maintenance' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
