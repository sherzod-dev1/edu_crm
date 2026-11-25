export const formatStaffPosition = (pos) => {
  if (!pos || typeof pos !== 'string') return '';
  const clean = pos.trim();
  const lower = clean.toLowerCase();

  // Buxgalter (imloviy xatolarni bartaraf qilish: bugalter -> Buxgalter)
  if (
    lower === 'bugalter' ||
    lower === 'buxgalter' ||
    lower === 'accountant' ||
    lower.includes('bugalter') ||
    lower.includes('buxgalter')
  ) {
    return 'Buxgalter';
  }
  if (lower === 'kassir' || lower.includes('kassa')) {
    return 'Kassir';
  }
  if (lower === 'menejer' || lower === 'manager' || lower.includes('menejer') || lower.includes('manager')) {
    return 'Menejer';
  }
  if (lower === 'administrator' || lower === 'admin') {
    return 'Administrator';
  }
  if (
    lower === 'nazoratchi' ||
    lower === 'supervisor' ||
    lower === 'inspektor' ||
    lower.includes('nazoratchi') ||
    lower.includes('supervisor') ||
    lower.includes('inspektor')
  ) {
    return 'Nazoratchi';
  }
  if (
    lower.includes("o'qituvchi") ||
    lower.includes('oqituvchi') ||
    lower.includes('teacher') ||
    lower.includes('ustoz')
  ) {
    return "O'qituvchi";
  }
  if (lower.includes('metodist')) {
    return 'Metodist';
  }
  if (lower.includes('reception') || lower.includes('qabulxona')) {
    return 'Administrator (Qabulxona)';
  }
  if (lower.includes('hr') || lower.includes('kadr')) {
    return "HR / Kadrlar mutaxassisi";
  }

  // Bosh harfni katta qilib qaytarish
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};
