import { formatCurrency } from '../format';

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
