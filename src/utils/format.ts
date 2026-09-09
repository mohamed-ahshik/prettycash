export function formatMoney(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toFixed(2);
}

export function formatSignedAmount(type: 'income' | 'expense', amount: number): string {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}$${formatMoney(amount)}`;
}

export function formatSignedMoney(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${formatMoney(Math.abs(value))}`;
}
