import {
  analyzeReceipt,
  formatAnalysisError,
  normalizeReceiptDraft,
  ReceiptAnalysisError,
} from '../receiptAnalysis';

const originalFetch = globalThis.fetch;
const ORIGINAL_URL = process.env.EXPO_PUBLIC_VISION_BASE_URL;
const ORIGINAL_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY;

beforeEach(() => {
  process.env.EXPO_PUBLIC_VISION_BASE_URL = 'https://vision.test';
  process.env.EXPO_PUBLIC_VISION_API_KEY = 'test-key';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (ORIGINAL_URL === undefined) delete process.env.EXPO_PUBLIC_VISION_BASE_URL;
  else process.env.EXPO_PUBLIC_VISION_BASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.EXPO_PUBLIC_VISION_API_KEY;
  else process.env.EXPO_PUBLIC_VISION_API_KEY = ORIGINAL_KEY;
  jest.useRealTimers();
});

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

it('returns safe defaults for malformed input with optional date/time', () => {
  const out = normalizeReceiptDraft(null);
  expect(out).toEqual({
    merchant: '', amount: 0, date: undefined, time: undefined, note: '', items: [],
  });
});

it('omits empty-string date and time', () => {
  const out = normalizeReceiptDraft({ merchant: 'X', amount: 1, date: '', time: '', note: '', items: [] });
  expect(out.date).toBeUndefined();
  expect(out.time).toBeUndefined();
});

it('formats an analysis error with message and code', () => {
  expect(formatAnalysisError(new ReceiptAnalysisError('TIMEOUT', 'Receipt analysis timed out.')))
    .toBe('Receipt analysis timed out. (TIMEOUT)');
});

it('formats a non-analysis error generically', () => {
  expect(formatAnalysisError(new Error('boom'))).toBe('Receipt analysis failed.');
});

it('enqueues then polls and returns the normalized draft on completed', async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'j1', status: 'pending' }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'completed', result: { merchant: 'Cafe', amount: 9.5, note: '', items: [] } }),
    });
  globalThis.fetch = fetchMock as any;

  const out = await analyzeReceipt('b64', 'image/jpeg');

  expect(out.merchant).toBe('Cafe');
  expect(out.amount).toBe(9.5);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0][0]).toBe('https://vision.test/analyze-receipt');
  expect(fetchMock.mock.calls[1][0]).toBe('https://vision.test/jobs/j1');
});

it('rejects with FAILED when the job fails', async () => {
  globalThis.fetch = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'j2', status: 'pending' }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'failed', error: { message: 'bad image' } }),
    }) as any;

  await expect(analyzeReceipt('b64', 'image/jpeg')).rejects.toMatchObject({
    code: 'FAILED',
    message: 'bad image',
  });
});

it('rejects with NOT_CONFIGURED when env is missing', async () => {
  process.env.EXPO_PUBLIC_VISION_BASE_URL = '';
  process.env.EXPO_PUBLIC_VISION_API_KEY = '';
  await expect(analyzeReceipt('b64', 'image/jpeg')).rejects.toMatchObject({
    code: 'NOT_CONFIGURED',
  });
});

it('rejects with TIMEOUT after the poll limit', async () => {
  jest.useFakeTimers();
  globalThis.fetch = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'j3', status: 'pending' }) })
    .mockResolvedValue({ ok: true, json: async () => ({ status: 'pending' }) }) as any;

  const promise = analyzeReceipt('b64', 'image/jpeg');
  const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' });
  await jest.advanceTimersByTimeAsync(120 * 1000 + 1000);
  await assertion;
});
