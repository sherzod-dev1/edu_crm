// Contract ma'lumotlarini to'liq tekshirish (Validation)
exports.validateContract = (data, isUpdate = false) => {
  if (!isUpdate) {
    // 1. admin_id tekshiruvi (Majburiy)
    if (!data.admin_id || isNaN(data.admin_id) || Number(data.admin_id) <= 0) {
      return { error: { details: [{ message: "admin_id kiritilishi shart va musbat butun son bo'lishi kerak" }] } };
    }

    // 2. start_date tekshiruvi (Majburiy)
    if (!data.start_date || isNaN(Date.parse(data.start_date))) {
      return { error: { details: [{ message: "Boshlanish sanasi (start_date) to'g'ri sana formatida (YYYY-MM-DD) bo'lishi shart" }] } };
    }
  }

  // 3. Plan tekshiruvi
  if (data.plan && !['Starter', 'Standart', 'Premium', 'starter', 'standart', 'premium'].includes(data.plan)) {
    return { error: { details: [{ message: "Tarif faqat 'Starter', 'Standart' yoki 'Premium' bo'lishi mumkin" }] } };
  }

  // 4. monthly_amount tekshiruvi
  if (data.monthly_amount !== undefined && data.monthly_amount !== null && data.monthly_amount !== '') {
    if (isNaN(data.monthly_amount) || Number(data.monthly_amount) <= 0) {
      return { error: { details: [{ message: "Oylik to'lov summasi (monthly_amount) musbat son bo'lishi shart" }] } };
    }
  }

  // 5. end_date tekshiruvi
  if (data.end_date && isNaN(Date.parse(data.end_date))) {
    return { error: { details: [{ message: "Tugash sanasi (end_date) to'g'ri sana formatida (YYYY-MM-DD) bo'lishi kerak" }] } };
  }

  // 6. Status tekshiruvi
  if (data.status && !['active', 'expiring_soon', 'expired', 'cancelled', 'pending'].includes(data.status.toLowerCase())) {
    return { error: { details: [{ message: "Status faqat 'active', 'expiring_soon', 'expired', 'cancelled' yoki 'pending' bo'lishi mumkin" }] } };
  }

  // 7. Payment status tekshiruvi
  if (data.payment_status && !['paid', 'unpaid', 'pending', 'cancelled'].includes(data.payment_status.toLowerCase())) {
    return { error: { details: [{ message: "To'lov holati faqat 'paid', 'unpaid' yoki 'pending' bo'lishi mumkin" }] } };
  }

  return { error: null };
};
