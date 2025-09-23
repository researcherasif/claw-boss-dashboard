export const formatCurrencyBDT = (amount: number): string => {
  try {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    // Fallback to symbol if Intl fails
    const safe = Number.isFinite(amount) ? amount : 0;
    return `৳${safe.toFixed(2)}`;
  }
};


