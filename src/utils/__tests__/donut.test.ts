import { donutHit } from '../donut';

const center = 70;
const inner = 54;
const outer = 70;
const segments = [
  { key: 'expense', percentage: 25 },
  { key: 'income', percentage: 75 },
];

it('returns a segment key for a point on its arc', () => {
  expect(donutHit(center, center - 62, center, inner, outer, segments)).toBe('expense');
  expect(donutHit(center, center + 62, center, inner, outer, segments)).toBe('income');
});

it('returns center for the hole and null outside the ring', () => {
  expect(donutHit(center, center, center, inner, outer, segments)).toBe('center');
  expect(donutHit(center, center - 100, center, inner, outer, segments)).toBe(null);
});
