import { monthYearFromDate } from './aggregate';

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
];

export function formatMonthFromDate(date: string): string {
  const { year, month } = monthYearFromDate(date);
  return `${MONTH_NAMES[month]} ${year}`;
}

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

export function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${formatMoney(Math.abs(value))}`;
}

export function formatHeaderDate(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMonthLabel(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
