import { monthYearFromDate } from './aggregate';

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const ZERO_DECIMAL = ['JPY', 'KRW', 'VND', 'CLP', 'ISK'];

export function currencySymbolFor(label: string): string {
  if (label.includes('€')) return '€';
  if (label.includes('£')) return '£';
  if (label.includes('¥')) return '¥';
  return '$';
}

export function currencyDecimalsFor(label: string): number {
  return ZERO_DECIMAL.includes(label.slice(0, 3).toUpperCase()) ? 0 : 2;
}

function withGrouping(value: number, decimals: number): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatMoney(value: number, decimals: number = 2): string {
  return withGrouping(value, decimals);
}

export function formatSignedAmount(
  type: 'income' | 'expense',
  amount: number,
  symbol: string,
  decimals: number = 2,
): string {
  if (amount === 0) return `${symbol}${formatMoney(0, decimals)}`;
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${symbol}${formatMoney(amount, decimals)}`;
}

export function formatCurrency(value: number, symbol: string, decimals: number = 2): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${formatMoney(value, decimals)}`;
}

export function formatHeaderDate(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMonthFromDate(date: string): string {
  const { year, month } = monthYearFromDate(date);
  return `${MONTH_NAMES[month]} ${year}`;
}
