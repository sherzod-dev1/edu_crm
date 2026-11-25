export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 so'm";
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
};
