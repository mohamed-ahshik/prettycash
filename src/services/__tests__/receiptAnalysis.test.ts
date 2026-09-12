import { normalizeReceiptDraft } from '../receiptAnalysis';

it('normalizes a full valid response', () => {
  const out = normalizeReceiptDraft({
    merchant: 'Whole Foods', amount: 42.75, date: '2026-09-13', time: '14:30', note: 'groceries',
    items: [
      { name: 'Milk', quantity: 2, price: 6.98 },
      { name: 'Avocado', price: 5.5 },
    ],
  });
  expect(out.merchant).toBe('Whole Foods');
  expect(out.amount).toBe(42.75);
  expect(out.items).toEqual([
    { name: 'Milk', quantity: 2, price: 6.98 },
    { name: 'Avocado', quantity: undefined, price: 5.5 },
  ]);
});

it('returns safe defaults for malformed input', () => {
  const out = normalizeReceiptDraft(null);
  expect(out).toEqual({ merchant: '', amount: 0, date: '', time: '', note: '', items: [] });
});
