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

it('normalizes category fields and ignores invalid types', () => {
  expect(normalizeReceiptDraft({ amount: 1, categoryId: 'c1', categoryConfidence: 0.9 }))
    .toMatchObject({ categoryId: 'c1', categoryConfidence: 0.9 });
  expect(normalizeReceiptDraft({ amount: 1, categoryId: 2, categoryConfidence: 'x' }))
    .toMatchObject({ categoryId: undefined, categoryConfidence: undefined });
});

it('sends autoCategorize and categories when enabled', async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'j1', status: 'pending' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'completed', result: { amount: 1 } }) });
  globalThis.fetch = fetchMock as any;
  const categories = [{ id: 'c1', name: 'Food', description: 'Groceries' }];

  await analyzeReceipt('b64', 'image/jpeg', { autoCategorize: true, categories });

  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.autoCategorize).toBe(true);
  expect(body.categories).toEqual(categories);
});

it('sends autoCategorize false and omits categories when disabled or empty', async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'j1', status: 'pending' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'completed', result: { amount: 1 } }) });
  globalThis.fetch = fetchMock as any;

  await analyzeReceipt('b64', 'image/jpeg', { autoCategorize: true, categories: [] });

  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.autoCategorize).toBe(false);
  expect(body).not.toHaveProperty('categories');
});

it('formats an analysis error with message and code', () => {
  expect(formatAnalysisError(new ReceiptAnalysisError('TIMEOUT', 'Receipt analysis timed out.')))
    .toBe('Receipt analysis timed out. (TIMEOUT)');
});

it('formats a non-analysis error generically', () => {
  expect(formatAnalysisError(new Error('boom'))).toBe('Receipt analysis failed.');
});

it('enqueues then polls and returns the normalized draft plus the raw result', async () => {
  const result = { merchant: 'Cafe', amount: 9.5, note: '', items: [] };
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'j1', status: 'pending' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'completed', result }) });
  globalThis.fetch = fetchMock as any;

  const out = await analyzeReceipt('b64', 'image/jpeg');

  expect(out.draft.merchant).toBe('Cafe');
  expect(out.draft.amount).toBe(9.5);
  expect(out.raw).toEqual(result);
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

it('rejects immediately with NOT_A_RECEIPT when the job is rejected', async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'j4', status: 'pending' }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'rejected',
        error: { code: 'NOT_A_RECEIPT', message: "This image doesn't look like a receipt or invoice." },
      }),
    });
  globalThis.fetch = fetchMock as any;

  await expect(
    Promise.race([
      analyzeReceipt('b64', 'image/jpeg'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('hung')), 100)),
    ]),
  ).rejects.toMatchObject({
    code: 'NOT_A_RECEIPT',
    message: "This image doesn't look like a receipt or invoice.",
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('times out a hung enqueue instead of waiting forever', async () => {
  jest.useFakeTimers();
  globalThis.fetch = jest.fn((_url: string, init: any) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  })) as any;

  const promise = analyzeReceipt('b64', 'image/jpeg');
  const assertion = expect(promise).rejects.toMatchObject({ code: 'NETWORK' });
  await jest.advanceTimersByTimeAsync(60000 + 1);
  await assertion;
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
