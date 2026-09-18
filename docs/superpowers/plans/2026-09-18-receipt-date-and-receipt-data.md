# Receipt Upload Date + `receipt_data` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default receipt transactions to the upload date (today) with an optional "use receipt date" hint, and persist the backend's full analysis result in a new `transactions.receipt_data` jsonb column.

**Architecture:** A DB migration adds the `receipt_data` column; the `Transaction` type/repository/mapper carry it through; `analyzeReceipt` returns `{ draft, raw }` (raw = the backend result); the add sheet stores `raw` and passes the extracted date to the form; the form defaults its date to today, offers a tap-to-use receipt-date hint, and warns when the chosen date is outside the current month.

**Tech Stack:** React Native (Expo SDK ~57), TypeScript, Supabase (Postgres jsonb), `jest-expo`.

## Global Constraints

- Expo SDK `~57.0.21`/`~57.0.23`; consult https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.
- No code comments in source. No new dependencies.
- `npx tsc --noEmit` and `npm test` must pass after each task.
- Receipt transactions default to **today**; the Date field stays editable.
- `receipt_data` stores the backend result **verbatim**; no backend changes.
- Insights keeps its own month state; the Home month picker is unchanged.
- The working tree may contain unrelated uncommitted changes; stage only the files each task names. The new migration must be applied with `supabase db push --linked --yes`.

**Implementation status:** Not started

---

### Task 1: Add the `receipt_data` column

**Files:**
- Create: `supabase/migrations/20260918000000_add_receipt_data.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260918000000_add_receipt_data.sql`:

```sql
alter table public.transactions add column if not exists receipt_data jsonb;
```

- [ ] **Step 2: Apply it to the linked project**

Run: `supabase db push --linked --yes`
Expected: `Applying migration 20260918000000_add_receipt_data.sql...` then `Finished supabase db push.`

- [ ] **Step 3: Verify the column exists**

Run:
```bash
set -a; . ./.env; set +a
curl -s -o /dev/null -w "%{http_code}\n" "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/transactions?select=receipt_data&limit=0" -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY"
```
Expected: `200` (a missing column would return `400` / `PGRST204`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260918000000_add_receipt_data.sql
git commit -m "feat: add transactions.receipt_data jsonb column"
```

---

### Task 2: Carry `receiptData` through the type, repo, and mapper

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/data/repositories/mappers.ts`
- Modify: `src/data/repositories/transactionsRepo.ts`
- Test: `src/data/repositories/__tests__/mappers.test.ts`

**Interfaces:**
- Produces: `Transaction` gains `receiptData?: unknown`; `insertTransaction` writes `receipt_data`; `mapTransactionRow` reads `receipt_data`.

- [ ] **Step 1: Write the failing test**

In `src/data/repositories/__tests__/mappers.test.ts`, add `receipt_data` to the transaction row and `receiptData` to the expectation:

```ts
it('maps a transaction row and its items', () => {
  const row = {
    id: 't1', name: 'Whole Foods', date: '2026-09-13', time: '9:42 AM',
    category_id: 'c1', type: 'expense', amount: 42.5, icon: 'cart-outline', note: null, receipt_path: null,
    receipt_data: { merchant: 'Whole Foods', amount: 42.5, date: '2026-09-13' },
    transaction_items: [
      { id: 'i1', name: 'Milk', quantity: 2, price: 3.0 },
      { id: 'i2', name: 'Eggs', quantity: null, price: 2.5 },
    ],
  };
  expect(mapTransactionRow(row)).toEqual({
    id: 't1', name: 'Whole Foods', date: '2026-09-13', time: '9:42 AM',
    categoryId: 'c1', type: 'expense', amount: 42.5, icon: 'cart-outline', note: undefined,
    receiptData: { merchant: 'Whole Foods', amount: 42.5, date: '2026-09-13' },
    items: [
      { id: 'i1', name: 'Milk', quantity: 2, price: 3.0 },
      { id: 'i2', name: 'Eggs', quantity: undefined, price: 2.5 },
    ],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/repositories/__tests__/mappers.test.ts`
Expected: FAIL — the mapped object has no `receiptData`.

- [ ] **Step 3: Add the type**

In `src/types/index.ts`, add to `interface Transaction`:

```ts
  receiptData?: unknown;
```

- [ ] **Step 4: Map it**

In `src/data/repositories/mappers.ts` `mapTransactionRow`, add next to `receiptPath`:

```ts
    receiptData: row.receipt_data ?? undefined,
```

- [ ] **Step 5: Persist it**

In `src/data/repositories/transactionsRepo.ts` `insertTransaction`, add to the insert object:

```ts
    receipt_data: input.receiptData ?? null,
```

- [ ] **Step 6: Run test and verify compile**

Run: `npx jest src/data/repositories/__tests__/mappers.test.ts` then `npx tsc --noEmit && npm test`
Expected: PASS / success.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/data/repositories/mappers.ts src/data/repositories/transactionsRepo.ts src/data/repositories/__tests__/mappers.test.ts
git commit -m "feat: persist and map transaction receipt_data"
```

---

### Task 3: `analyzeReceipt` returns `{ draft, raw }`

**Files:**
- Modify: `src/services/receiptAnalysis.ts`
- Test: `src/services/__tests__/receiptAnalysis.test.ts`

**Interfaces:**
- Produces: `analyzeReceipt(imageBase64, mimeType): Promise<{ draft: ReceiptDraft; raw: unknown }>` (also export the `AnalyzedReceipt` interface).

- [ ] **Step 1: Update the failing test**

In `src/services/__tests__/receiptAnalysis.test.ts`, change the completed-job test so it asserts the new shape:

```ts
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
```

Replace the existing `'enqueues then polls and returns the normalized draft on completed'` test with this one.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/receiptAnalysis.test.ts`
Expected: FAIL — `out.draft` is undefined.

- [ ] **Step 3: Implement the new return shape**

In `src/services/receiptAnalysis.ts`, add the interface near `ReceiptAnalysisError`:

```ts
export interface AnalyzedReceipt {
  draft: ReceiptDraft;
  raw: unknown;
}
```

Change `analyzeReceipt`'s signature from `Promise<ReceiptDraft>` to `Promise<AnalyzedReceipt>` and replace the completed-branch return:

```ts
    if (body?.status === 'completed') {
      return { draft: normalizeReceiptDraft(body.result), raw: body.result };
    }
```

- [ ] **Step 4: Run test and verify compile**

Run: `npx jest src/services/__tests__/receiptAnalysis.test.ts` then `npx tsc --noEmit && npm test`
Expected: PASS / success. (Other callers are updated in Task 5.)

- [ ] **Step 5: Commit**

```bash
git add src/services/receiptAnalysis.ts src/services/__tests__/receiptAnalysis.test.ts
git commit -m "feat: return raw analysis result alongside the receipt draft"
```

---

### Task 4: Month-name helper + form date UX

**Files:**
- Modify: `src/utils/format.ts`
- Test: `src/utils/__tests__/format.test.ts`
- Modify: `src/components/MonthYearPickerModal.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/InsightsScreen.tsx`
- Modify: `src/components/TransactionForm.tsx`

**Interfaces:**
- Produces: `MONTH_NAMES` and `formatMonthFromDate(date: string): string` from `src/utils/format.ts`.
- Produces: `TransactionForm` accepts an optional `receiptDate?: string` prop and defaults its date to today.

- [ ] **Step 1: Add the failing helper test**

In `src/utils/__tests__/format.test.ts`, add `formatMonthFromDate` and `MONTH_NAMES` to the existing import from `'../format'`, then append:

```ts
describe('formatMonthFromDate', () => {
  it('formats an ISO date as an abbreviated month and year', () => {
    expect(formatMonthFromDate('2024-03-29')).toBe('Mar 2024');
  });

  it('falls back to the current month for an invalid date', () => {
    const now = new Date();
    expect(formatMonthFromDate('nope')).toBe(`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/format.test.ts`
Expected: FAIL — `formatMonthFromDate is not a function`.

- [ ] **Step 3: Move month names and add the helper**

In `src/utils/format.ts`, add the import and the names/helper:

```ts
import { monthYearFromDate } from './aggregate';

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
];

export function formatMonthFromDate(date: string): string {
  const { year, month } = monthYearFromDate(date);
  return `${MONTH_NAMES[month]} ${year}`;
}
```

- [ ] **Step 4: Update the modal and screens to use the shared names**

In `src/components/MonthYearPickerModal.tsx`, delete the local `MONTH_NAMES` const and add:

```ts
import { MONTH_NAMES } from '../utils/format';
```

In `src/screens/HomeScreen.tsx`, change the modal import to only the modal, and import the names from format:

```ts
import { MonthYearPickerModal } from '../components/MonthYearPickerModal';
```
```ts
import { formatHeaderDate, MONTH_NAMES } from '../utils/format';
```

Do the same split in `src/screens/InsightsScreen.tsx`:

```ts
import { MonthYearPickerModal } from '../components/MonthYearPickerModal';
```
```ts
import { MONTH_NAMES } from '../utils/format';
```

- [ ] **Step 5: Update `TransactionForm`**

In `src/components/TransactionForm.tsx`:

Add imports:

```ts
import { currentMonthKey } from '../utils/aggregate';
import { formatMonthFromDate } from '../utils/format';
```

Add the props to the interface:

```ts
  receiptDate?: string;
  initialDate?: string;
```

Destructure them:

```ts
export function TransactionForm({ initial, receiptDate, initialDate, onSubmit, onCancel }: TransactionFormProps) {
```

Change the date initializer so an explicit `initialDate` wins (edit mode) and otherwise defaults to today:

```ts
  const [date, setDate] = useState(initialDate ?? todayString());
```

Compute the hint/disclaimer just above the `return`:

```ts
  const showReceiptDateHint = Boolean(receiptDate) && receiptDate !== date;
  const hasMonth = /^\d{4}-\d{2}/.test(date);
  const showMonthDisclaimer = hasMonth && date.slice(0, 7) !== currentMonthKey();
```

Render them directly after the `dateRow` `</View>`:

```tsx
        {showReceiptDateHint ? (
          <View style={styles.receiptDateRow}>
            <Text style={styles.receiptDateText}>Receipt date: {receiptDate}</Text>
            <Pressable onPress={() => setDate(receiptDate as string)}>
              <Text style={styles.receiptDateUse}>Use</Text>
            </Pressable>
          </View>
        ) : null}

        {showMonthDisclaimer ? (
          <Text style={styles.monthDisclaimer}>
            This transaction will be recorded under {formatMonthFromDate(date)}.
          </Text>
        ) : null}
```

Add these styles to the `StyleSheet`:

```ts
  receiptDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  receiptDateText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  receiptDateUse: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  monthDisclaimer: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
```

- [ ] **Step 6: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add src/utils/format.ts src/utils/__tests__/format.test.ts src/components/MonthYearPickerModal.tsx src/screens/HomeScreen.tsx src/screens/InsightsScreen.tsx src/components/TransactionForm.tsx
git commit -m "feat: default receipt date to today with receipt-date hint"
```

---

### Task 5: Wire the add sheet + mark the spec implemented

**Files:**
- Modify: `src/components/AddTransactionSheet.tsx`
- Modify: `docs/superpowers/specs/2026-09-18-receipt-date-and-receipt-data-design.md`

**Interfaces:**
- Consumes: `analyzeReceipt` returning `{ draft, raw }` (Task 3); `TransactionForm`'s `receiptDate` prop (Task 4); `Transaction.receiptData` (Task 2).

- [ ] **Step 1: Track the raw result**

In `src/components/AddTransactionSheet.tsx`, add state next to `receiptPath`:

```ts
  const [receiptData, setReceiptData] = useState<unknown>(null);
```

Then add `setReceiptData(null);` immediately after each existing `setReceiptPath(null);` — there are three: in the `useEffect` when `!visible`, at the start of `handlePicked`, and in `handleManual`.

- [ ] **Step 2: Capture the raw result from the analysis**

Replace the analysis block in `handlePicked`:

```ts
    try {
      const { draft: result, raw } = await analyzeReceipt(base64, mimeType);
      if (token !== requestToken.current) return;
      setDraft(result);
      setReceiptData(raw);
      setError(null);
      setFlow('form');
    } catch (e) {
```

- [ ] **Step 3: Pass the extracted date to the form and persist the raw result**

In the `flow === 'form'` block, pass the receipt date:

```tsx
              <TransactionForm
                initial={draft ?? undefined}
                receiptDate={draft?.date}
                onSubmit={handleSubmit}
                onCancel={onClose}
              />
```

In `handleSubmit`, attach the raw data:

```ts
      await addTransaction({ ...input, receiptPath: receiptPath ?? undefined, receiptData: receiptData ?? undefined });
```

- [ ] **Step 4: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 5: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-18-receipt-date-and-receipt-data-design.md`, set:

```
**Implementation status:** Implemented
```

- [ ] **Step 6: Commit**

```bash
git add src/components/AddTransactionSheet.tsx docs/superpowers/specs/2026-09-18-receipt-date-and-receipt-data-design.md
git commit -m "feat: store receipt analysis on save and default date to today"
```
