import {
  currencyDecimalsFor,
  formatCurrency,
  formatMoney,
  formatSignedAmount,
  formatMonthFromDate,
  MONTH_NAMES,
} from '../format';

describe('formatMoney', () => {
  it('always renders grouping and two decimals', () => {
    expect(formatMoney(2990)).toBe('2,990.00');
    expect(formatMoney(4280.5)).toBe('4,280.50');
    expect(formatMoney(1234567.891)).toBe('1,234,567.89');
  });
});

describe('formatCurrency', () => {
  it('formats positive values with a leading symbol', () => {
    expect(formatCurrency(4280.5, '$')).toBe('$4,280.50');
  });

  it('puts the sign before the symbol for negatives', () => {
    expect(formatCurrency(-281.7, '$')).toBe('-$281.70');
  });

  it('formats zero', () => {
    expect(formatCurrency(0, '$')).toBe('$0.00');
  });

  it('uses the provided symbol', () => {
    expect(formatCurrency(5, '€')).toBe('€5.00');
  });

  it('formats zero-decimal currencies without cents', () => {
    expect(formatCurrency(1000, '¥', 0)).toBe('¥1,000');
    expect(formatMoney(1234, 0)).toBe('1,234');
  });
});

describe('currencyDecimalsFor', () => {
  it('returns 0 for zero-decimal currencies and 2 otherwise', () => {
    expect(currencyDecimalsFor('JPY (¥)')).toBe(0);
    expect(currencyDecimalsFor('USD ($)')).toBe(2);
  });
});

describe('formatSignedAmount', () => {
  it('signs income and expense amounts', () => {
    expect(formatSignedAmount('income', 1000, '$')).toBe('+$1,000.00');
    expect(formatSignedAmount('expense', 10, '$')).toBe('-$10.00');
  });

  it('does not sign zero', () => {
    expect(formatSignedAmount('income', 0, '$')).toBe('$0.00');
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
