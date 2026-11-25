// Teacher ma'lumotlarini to'liq tekshirish (Validation)
exports.validateTeacher = (data, isUpdate = false) => {
    // 1. user_id tekshiruvi (Create da Majburiy, Update da Ixtiyoriy)
    if (!isUpdate || data.user_id !== undefined) {
        if (!data.user_id || isNaN(data.user_id) || Number(data.user_id) <= 0) {
            return { error: { details: [{ message: "user_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 2. Mutaxassislik (specialization) tekshiruvi (Majburiy)
    if (!isUpdate || data.specialization !== undefined) {
        if (!data.specialization || typeof data.specialization !== 'string' || data.specialization.trim().length < 2) {
            return { error: { details: [{ message: "Mutaxassislik (specialization) kiritilishi shart va kamida 2 ta belgidan iborat bo'lishi kerak" }] } };
        }
        if (data.specialization.trim().length > 150) {
            return { error: { details: [{ message: "Mutaxassislik 150 ta belgidan oshmasligi kerak" }] } };
        }
    }

    // 3. branch_id tekshiruvi (Ixtiyoriy)
    if (data.branch_id !== undefined && data.branch_id !== null && data.branch_id !== '') {
        if (isNaN(data.branch_id) || Number(data.branch_id) <= 0) {
            return { error: { details: [{ message: "branch_id musbat butun son bo'lishi kerak" }] } };
        }
    }

    // 4. Tajriba yili (experience_year) tekshiruvi (Ixtiyoriy)
    if (data.experience_year !== undefined && data.experience_year !== null && data.experience_year !== '') {
        if (isNaN(data.experience_year) || Number(data.experience_year) < 0) {
            return { error: { details: [{ message: "Tajriba yili (experience_year) manfiy bo'lmasligi kerak" }] } };
        }
    }

    // 5. Maosh miqdori (salary_amount) tekshiruvi (Ixtiyoriy)
    if (data.salary_amount !== undefined && data.salary_amount !== null && data.salary_amount !== '') {
        if (isNaN(data.salary_amount) || Number(data.salary_amount) < 0) {
            return { error: { details: [{ message: "Maosh miqdori (salary_amount) manfiy bo'lmasligi kerak" }] } };
        }
    }

    // 6. Status tekshiruvi (Ixtiyoriy)
    if (data.status && !['active', 'inactive'].includes(data.status.toLowerCase())) {
        return { error: { details: [{ message: "Status faqat 'active' yoki 'inactive' bo'lishi mumkin" }] } };
    }

    return { error: null };
};
