import { formatCurrency, formatMonthFromDate, MONTH_NAMES } from '../format';

describe('formatCurrency', () => {
  it('formats positive values with a leading dollar sign', () => {
    expect(formatCurrency(4280.5)).toBe('$4280.50');
  });

  it('puts the sign before the dollar sign for negatives', () => {
    expect(formatCurrency(-281.7)).toBe('-$281.70');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });
});

describe('formatMonthFromDate', () => {
  it('formats an ISO date as an abbreviated month and year', () => {
    expect(formatMonthFromDate('2024-03-29')).toBe('Mar 2024');
  });

  it('falls back to the current month for an invalid date', () => {
    const now = new Date();
    expect(formatMonthFromDate('nope')).toBe(`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
  });
});
