# Add Transaction with AI Receipt Scan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the tab bar `+` button to an "Add Transaction" flow where a user scans a receipt (AI-extracted) or enters manually, then sees the new transaction (with optional expandable line items) in the Home list.

**Architecture:** A new in-memory `TransactionsContext` holds a flat list of transactions and groups them by day for rendering. A `receiptAnalysis` service POSTs the receipt image to a configurable backend (`EXPO_PUBLIC_VISION_BASE_URL`) and normalizes the structured response into a draft the form pre-fills. UI is a bottom-sheet flow (chooser → capture/manual → editable form) following the existing `AddCategoryModal` pattern.

**Tech Stack:** React Native 0.86 / Expo SDK 57, react-native-web, TypeScript, `expo-image-picker`, `jest-expo`.

**Implementation status:** Implemented; 2026-10-22 fixes handle the backend `rejected` (`NOT_A_RECEIPT`) job status immediately, bound hung requests (enqueue 60s for large base64 images, polls 15s) instead of leaving the analyzing screen open indefinitely, and surface image-picker launch failures (including Expo Go cache write errors) as an in-sheet message instead of an uncaught rejection. 2026-10-24: in development the vision base URL derives the backend host from Expo's `hostUri` (same host as Metro, port 8000), so LAN IP changes no longer break receipt scanning; the env URL remains the fallback for public or tunnel hosts. The “Reading receipt…” scan line now uses a classic `Animated.loop` so it survives the post-upload re-render during polling (the Reanimated `withRepeat` loop froze on web).

## Global Constraints

- Expo SDK `~57.0.21`; consult https://docs.expo.dev/versions/v57.0.0/ for any Expo API before writing code.
- `expo-image-picker` is installed via `npx expo install` (SDK-57-matched version).
- Deprecated style props must NOT be used: use `boxShadow` (not `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`) and `style.pointerEvents` (not the `pointerEvents` prop).
- Env vars are read as `process.env.EXPO_PUBLIC_VISION_BASE_URL` and `process.env.EXPO_PUBLIC_VISION_API_KEY` (client-exposed).
- No code comments unless asked. Follow existing naming/style (components are named exports; styles via `StyleSheet.create` using `src/theme`).
- The Gemini/provider API key NEVER lives in the app — only the app→backend credential.
- TypeScript must compile (`npx tsc --noEmit`) and `npm test` must pass after each task.

---

### Task 1: Jest test tooling

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `npm test` runs Jest with the `jest-expo` preset.

- [ ] **Step 1: Install dev dependencies**

Run: `npx expo install jest-expo jest @types/jest --dev`

- [ ] **Step 2: Add Jest config and test script to `package.json`**

Add to `"scripts"`:
```json
"test": "jest"
```
Add a top-level `"jest"` field:
```json
"jest": {
  "preset": "jest-expo"
}
```

- [ ] **Step 3: Verify a trivial test runs**

Create `src/utils/__tests__/smoke.test.ts`:
```ts
it('jest runs', () => {
  expect(1 + 1).toBe(2);
});
```
Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/utils/__tests__/smoke.test.ts
git commit -m "chore: add jest-expo test tooling"
```

---

### Task 2: Data layer — types, seed data, grouping, TransactionsContext, Home wiring

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/data/seedTransactions.ts`
- Modify: `src/data/mockData.ts`
- Create: `src/utils/groupTransactions.ts`
- Test: `src/utils/__tests__/groupTransactions.test.ts`
- Create: `src/context/TransactionsContext.tsx`
- Modify: `App.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/components/TransactionRow.tsx`
- Modify: `src/theme/index.ts`
- Delete: `src/theme/categories.ts`

**Interfaces:**
- Consumes: existing `CategoryItem` (from `CategoriesContext`).
- Produces:
  - `LineItem { id: string; name: string; quantity?: number; price: number }`
  - `Transaction { id, name, date: string, time: string, categoryId: string, type: 'income'|'expense', amount: number, icon: string, note?: string, items?: LineItem[] }`
  - `TransactionGroup { label, total, transactions }`
  - `groupTransactionsByDay(transactions, today?) => TransactionGroup[]`
  - `useTransactions() => { groups: TransactionGroup[]; addTransaction(input: Omit<Transaction,'id'>) }`

- [ ] **Step 1: Update types in `src/types/index.ts`**

Replace the current `Category` union, `Transaction`, and add `LineItem`/`ReceiptDraft`. Final file content (transaction-related parts):
```ts
export type TransactionType = 'income' | 'expense';

export interface LineItem {
  id: string;
  name: string;
  quantity?: number;
  price: number;
}

export interface Transaction {
  id: string;
  name: string;
  date: string;
  time: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  icon: string;
  note?: string;
  items?: LineItem[];
}

export interface TransactionGroup {
  label: string;
  total: number;
  transactions: Transaction[];
}

export interface ReceiptDraft {
  merchant: string;
  amount: number;
  date: string;
  time: string;
  note: string;
  items: { name: string; quantity?: number; price: number }[];
}

export * from './category';
export * from './insights';
export * from './profile';
```
(Remove the old `export type Category = ...` line entirely.)

- [ ] **Step 2: Create `src/data/seedTransactions.ts`**

```ts
import { Transaction } from '../types';

export const seedTransactions: Transaction[] = [
  { id: '1', name: 'Whole Foods Market', date: '2026-09-09', time: '9:42 AM', categoryId: 'exp-food', type: 'expense', amount: 86.4, icon: 'cart-outline' },
  { id: '2', name: 'Uber', date: '2026-09-09', time: '8:15 AM', categoryId: 'exp-travel', type: 'expense', amount: 24.8, icon: 'car-outline' },
  { id: '3', name: 'Netflix', date: '2026-09-08', time: '7:30 PM', categoryId: 'exp-fun', type: 'expense', amount: 15.99, icon: 'play' },
  { id: '4', name: 'Coffee Run', date: '2026-09-08', time: '8:05 AM', categoryId: 'exp-drinks', type: 'expense', amount: 6.2, icon: 'coffee-outline' },
  { id: '5', name: 'Salary September', date: '2026-09-01', time: '9:00 AM', categoryId: 'inc-salary', type: 'income', amount: 5200, icon: 'briefcase-outline' },
];
```
(`categoryId` values match the `DEFAULT_*_CATEGORIES` ids in `src/context/CategoriesContext.tsx`.)

- [ ] **Step 3: Remove grouped transactions from `src/data/mockData.ts`**

Delete the `mockTransactions` export (keep `mockUser`, `mockMonth`, `mockBalance`), and remove the now-unused `TransactionGroup` import.

- [ ] **Step 4: Write the failing test for `groupTransactionsByDay`**

Create `src/utils/__tests__/groupTransactions.test.ts`:
```ts
import { groupTransactionsByDay } from '../groupTransactions';
import { Transaction } from '../../types';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'x', name: 'n', date: '2026-09-09', time: '9:00 AM',
  categoryId: 'exp-food', type: 'expense', amount: 10, icon: 'cart-outline', ...over,
});

it('groups by day and computes signed totals', () => {
  const txs = [
    tx({ id: '1', date: '2026-09-09', type: 'expense', amount: 20 }),
    tx({ id: '2', date: '2026-09-09', type: 'income', amount: 50 }),
    tx({ id: '3', date: '2026-09-01', type: 'expense', amount: 5 }),
  ];
  const groups = groupTransactionsByDay(txs, new Date(2026, 8, 9));
  expect(groups.map((g) => g.label)).toEqual(['Today', 'Sep 1']);
  expect(groups[0].total).toBe(30); // -20 + 50
  expect(groups[1].total).toBe(-5);
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test groupTransactions`
Expected: FAIL (module not found).

- [ ] **Step 6: Implement `src/utils/groupTransactions.ts`**

```ts
import { Transaction, TransactionGroup } from '../types';

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayLabel(dateStr: string, today: Date): string {
  const d = startOfDay(parseDate(dateStr));
  const t = startOfDay(today);
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function groupTransactionsByDay(
  transactions: Transaction[],
  today: Date = new Date()
): TransactionGroup[] {
  const sorted = [...transactions].sort(
    (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
  );
  const map = new Map<string, Transaction[]>();
  for (const t of sorted) {
    const label = dayLabel(t.date, today);
    const list = map.get(label) ?? [];
    list.push(t);
    map.set(label, list);
  }
  return Array.from(map.entries()).map(([label, list]) => ({
    label,
    total: list.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
    transactions: list,
  }));
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test groupTransactions`
Expected: PASS.

- [ ] **Step 8: Create `src/context/TransactionsContext.tsx`**

```tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Transaction, TransactionGroup } from '../types';
import { groupTransactionsByDay } from '../utils/groupTransactions';
import { seedTransactions } from '../data/seedTransactions';

interface TransactionsContextType {
  groups: TransactionGroup[];
  addTransaction: (input: Omit<Transaction, 'id'>) => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);

  const addTransaction = (input: Omit<Transaction, 'id'>) => {
    const tx: Transaction = { ...input, id: `tx-${Date.now()}` };
    setTransactions((prev) => [tx, ...prev]);
  };

  const groups = useMemo(() => groupTransactionsByDay(transactions), [transactions]);

  return (
    <TransactionsContext.Provider value={{ groups, addTransaction }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}
```

- [ ] **Step 9: Wrap the app with `TransactionsProvider` in `App.tsx`**

Add `import { TransactionsProvider } from './src/context/TransactionsContext';` and nest it inside `CategoriesProvider`:
```tsx
<SafeAreaProvider>
  <CategoriesProvider>
    <TransactionsProvider>
      {Platform.OS === 'web' ? (
        <View style={styles.webOuter}>
          <View style={styles.phoneFrame}>{content}</View>
        </View>
      ) : (
        content
      )}
    </TransactionsProvider>
  </CategoriesProvider>
</SafeAreaProvider>
```

- [ ] **Step 10: Update `HomeScreen` to read transactions from context**

Replace the `mockTransactions` import/usage:
```tsx
import { useTransactions } from '../context/TransactionsContext';
// ...
export function HomeScreen() {
  const { groups } = useTransactions();
  // ...
  <View style={styles.listCard}>
    {groups.map((group) => (
      <TransactionGroup key={group.label} group={group} />
    ))}
  </View>
}
```
Keep `mockBalance`, `mockUser`, `mockMonth` imports from `mockData`.

- [ ] **Step 11: Reconcile `TransactionRow` to dynamic categories**

Replace the `CATEGORY_STYLES` lookup with a `useCategories()` lookup by `categoryId`:
```tsx
import { useCategories } from '../context/CategoriesContext';
// inside component:
const { expenseCategories, incomeCategories } = useCategories();
const category = [...expenseCategories, ...incomeCategories].find((c) => c.id === transaction.categoryId);
const bg = category?.colorBg ?? colors.muted;
const fg = category?.colorFg ?? colors.mutedForeground;
const iconName = category?.icon ?? transaction.icon;
const isIncome = transaction.type === 'income';
const amountColor = isIncome ? colors.incomeText : colors.foreground;

return (
  <View style={styles.row}>
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      <Icon name={iconName} size={20} color={fg} />
    </View>
    <View style={styles.info}>
      <Text style={styles.name} numberOfLines={1}>{transaction.name}</Text>
      <Text style={styles.meta}>{transaction.time} • {category?.name ?? 'Other'}</Text>
    </View>
    <Text style={[styles.amount, { color: amountColor }]}>
      {formatSignedAmount(transaction.type, transaction.amount)}
    </Text>
  </View>
);
```
Remove the `CATEGORY_STYLES` import.

- [ ] **Step 12: Remove `CATEGORY_STYLES` from the theme**

Edit `src/theme/index.ts` to remove `export { CATEGORY_STYLES } from './categories';`. Delete `src/theme/categories.ts`.

- [ ] **Step 13: Verify compile and behavior**

Run: `npx tsc --noEmit` (expect success) and `npm test` (expect PASS).
Manual check: `npm start` → web; Home still lists the seeded transactions grouped by day.

- [ ] **Step 14: Commit**

```bash
git add src/types/index.ts src/data/seedTransactions.ts src/data/mockData.ts src/utils/groupTransactions.ts src/utils/__tests__/groupTransactions.test.ts src/context/TransactionsContext.tsx App.tsx src/screens/HomeScreen.tsx src/components/TransactionRow.tsx src/theme/index.ts
git rm src/theme/categories.ts
git commit -m "feat: add transactions data layer with dynamic categories and day grouping"
```

---

### Task 3: Env config + `.env.example`

**Files:**
- Create: `.env.example`
- Create: `src/config.ts`

**Interfaces:**
- Produces: `getVisionConfig() => { baseUrl: string; apiKey: string }` reading `process.env.EXPO_PUBLIC_VISION_BASE_URL` / `EXPO_PUBLIC_VISION_API_KEY`.

- [ ] **Step 1: Create `.env.example`**

```
EXPO_PUBLIC_VISION_BASE_URL=https://your-backend.example.com
EXPO_PUBLIC_VISION_API_KEY=your-app-to-backend-token
```
(Note: `.env` itself is already gitignored; do not create it with real secrets.)

- [ ] **Step 2: Create `src/config.ts`**

```ts
export function getVisionConfig() {
  return {
    baseUrl: process.env.EXPO_PUBLIC_VISION_BASE_URL ?? '',
    apiKey: process.env.EXPO_PUBLIC_VISION_API_KEY ?? '',
  };
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add .env.example src/config.ts
git commit -m "feat: add vision backend env config"
```

---

### Task 4: Receipt analysis service

**Files:**
- Create: `src/services/receiptAnalysis.ts`
- Test: `src/services/__tests__/receiptAnalysis.test.ts`

**Interfaces:**
- Consumes: `getVisionConfig()` from `src/config.ts`; `ReceiptDraft` from `../types`.
- Produces:
  - `ReceiptAnalysisError` (class with `.code`)
  - `normalizeReceiptDraft(data: unknown) => ReceiptDraft`
  - `analyzeReceipt(imageBase64: string, mimeType: string) => Promise<ReceiptDraft>`

- [ ] **Step 1: Write the failing test for `normalizeReceiptDraft`**

Create `src/services/__tests__/receiptAnalysis.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test receiptAnalysis`
Expected: FAIL.

- [ ] **Step 3: Implement `src/services/receiptAnalysis.ts`**

```ts
import { ReceiptDraft } from '../types';
import { getVisionConfig } from '../config';

export class ReceiptAnalysisError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ReceiptAnalysisError';
  }
}

export function normalizeReceiptDraft(data: unknown): ReceiptDraft {
  const d = (data ?? {}) as Record<string, any>;
  const items = Array.isArray(d.items)
    ? d.items
        .filter((it: any) => it && typeof it.name === 'string')
        .map((it: any) => ({
          name: it.name,
          quantity: typeof it.quantity === 'number' ? it.quantity : undefined,
          price: Number(it.price) || 0,
        }))
    : [];
  return {
    merchant: typeof d.merchant === 'string' ? d.merchant : '',
    amount: Number(d.amount) || 0,
    date: typeof d.date === 'string' ? d.date : '',
    time: typeof d.time === 'string' ? d.time : '',
    note: typeof d.note === 'string' ? d.note : '',
    items,
  };
}

export async function analyzeReceipt(imageBase64: string, mimeType: string): Promise<ReceiptDraft> {
  const { baseUrl, apiKey } = getVisionConfig();
  if (!baseUrl || !apiKey) {
    throw new ReceiptAnalysisError('NOT_CONFIGURED', 'Vision backend is not configured.');
  }
  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}/analyze-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ image: { base64: imageBase64, mimeType } }),
    });
  } catch {
    throw new ReceiptAnalysisError('NETWORK', 'Could not reach the vision backend.');
  }
  if (!res.ok) {
    let code = 'INTERNAL';
    let message = 'Receipt analysis failed.';
    try {
      const body = await res.json();
      code = body?.error?.code ?? code;
      message = body?.error?.message ?? message;
    } catch {}
    throw new ReceiptAnalysisError(code, message);
  }
  return normalizeReceiptDraft(await res.json());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test receiptAnalysis`
Expected: PASS.

- [ ] **Step 5: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/services/receiptAnalysis.ts src/services/__tests__/receiptAnalysis.test.ts
git commit -m "feat: add receipt analysis service with response normalization"
```

---

### Task 5: `expo-image-picker` dependency + config plugin

**Files:**
- Modify: `package.json` (via install)
- Modify: `app.json`

- [ ] **Step 1: Install**

Run: `npx expo install expo-image-picker`

- [ ] **Step 2: Add the config plugin to `app.json`**

In the `"plugins"` array add:
```json
[
  "expo-image-picker",
  {
    "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to scan receipts.",
    "cameraPermission": "Allow $(PRODUCT_NAME) to use the camera to scan receipts.",
    "microphonePermission": false
  }
]
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: add expo-image-picker"
```

---

### Task 6: Shared `TransactionForm`

**Files:**
- Create: `src/components/TransactionForm.tsx`

**Interfaces:**
- Consumes: `CategoryItem`, `Transaction`, `LineItem`, `TransactionType`; `useCategories()`.
- Produces: `TransactionForm` component with props:
  ```ts
  interface TransactionFormProps {
    initial?: Partial<ReceiptDraft>;
    onSubmit: (input: Omit<Transaction, 'id'>) => void;
    onCancel: () => void;
  }
  ```

- [ ] **Step 1: Implement `src/components/TransactionForm.tsx`**

Component state: `name`, `amount`, `date`, `time`, `note`, `items: LineItem[]`, `type: TransactionType`, `categoryId: string | null`. Initialize from `initial` (a `Partial<ReceiptDraft>`): map `initial.merchant → name`, `initial.amount → String(amount)`, `initial.date → date`, `initial.time → time`, `initial.note → note`, and map `initial.items → LineItem[]` by assigning each an id:
```ts
const initialItems: LineItem[] = (initial?.items ?? []).map((it) => ({
  id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: it.name,
  quantity: it.quantity,
  price: it.price,
}));
```
Defaults when `initial` is undefined: `date` = today (`YYYY-MM-DD`), `time` = current time (`h:mm AM`), `type` = `'expense'`, category = first expense category.

Key behavior:
- Expense/Income segmented toggle (reuse the pattern in `CategoriesScreen`/`SegmentedControl`) that resets `categoryId` to the first category of the selected type.
- Category list rendered from `useCategories()` filtered by `type`; tapping selects `categoryId`.
- Line items editor: list of rows with `name` + `price` (+ optional `quantity`) inputs and a remove button; an "Add item" button appends `{ id: \`it-${Date.now()}\`, name: '', price: 0 }`.
- On submit, validate `name.trim()` and a numeric `amount` > 0; build the transaction:
  ```ts
  const category = [...expenseCategories, ...incomeCategories].find((c) => c.id === categoryId);
  onSubmit({
    name: name.trim(),
    date,
    time,
    categoryId: categoryId ?? '',
    type,
    amount: Number(amount),
    icon: category?.icon ?? 'receipt',
    note: note.trim() || undefined,
    items: items.length ? items : undefined,
  });
  ```
- The submit button is disabled while `!name.trim()` or `Number(amount) <= 0`.
- Render inside a `Modal`-style bottom sheet (follow `AddCategoryModal` styling: `backdrop`, `modalCard`, `dismissOverlay`, header with title + close).

Use `TextInput` for name/amount/note; for date/time use two `TextInput` fields with placeholders `YYYY-MM-DD` and `h:mm AM` (simple text entry for now; a native date/time picker is out of scope).

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/TransactionForm.tsx
git commit -m "feat: add shared transaction form with category picker and line items"
```

---

### Task 7: Expandable transaction row

**Files:**
- Modify: `src/components/TransactionRow.tsx`

**Interfaces:**
- Consumes: `Transaction`, `LineItem`, `formatSignedAmount`, `formatMoney`.
- Produces: tappable `TransactionRow` that expands to show `transaction.items` when present.

- [ ] **Step 1: Add expand/collapse to `TransactionRow`**

- Import `useState` and `Pressable`.
- Wrap the row in a `Pressable` with `onPress={() => transaction.items?.length && setExpanded((e) => !e)}`.
- Add a chevron `Icon` (`chevron-down` collapsed / `chevron-up` expanded) shown only when `transaction.items?.length`.
- When `expanded`, render an items list below the row:
  ```tsx
  {expanded && transaction.items?.map((item) => (
    <View key={item.id} style={styles.itemRow}>
      <Text style={styles.itemName}>{item.quantity ? `${item.quantity}× ` : ''}{item.name}</Text>
      <Text style={styles.itemPrice}>${formatMoney(item.price)}</Text>
    </View>
  ))}
  ```
- Add styles: `itemRow` (row, space-between, padded-left ~52 to align under name), `itemName`/`itemPrice` (12pt, mutedForeground / foreground).

- [ ] **Step 2: Verify compile and manual check**

Run: `npx tsc --noEmit`. Manual: a seeded transaction has no `items` (not expandable); temporarily verify the expand UI renders by testing with a transaction that has items (or skip until Task 9 integration).

- [ ] **Step 3: Commit**

```bash
git add src/components/TransactionRow.tsx
git commit -m "feat: make transaction rows expandable to show line items"
```

---

### Task 8: Receipt image capture

**Files:**
- Create: `src/components/ReceiptImagePicker.tsx`

**Interfaces:**
- Consumes: `expo-image-picker`.
- Produces: `ReceiptImagePicker` with props `{ onPicked: (base64: string, mimeType: string) => void; onCancel: () => void }`, plus `getImageBase64(asset)` helper used here.

- [ ] **Step 1: Implement `src/components/ReceiptImagePicker.tsx`**

Two buttons: "Take photo" and "Choose from gallery".

- For gallery:
  ```ts
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.8 });
  ```
- For camera:
  ```ts
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return; // show inline "camera permission denied" text
  const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
  ```
- Extract base64 + mime type from the asset (covers web where `base64` may be null but `file` is a `File`):
  ```ts
  async function getImageBase64(asset: ImagePicker.ImagePickerAsset): Promise<{ base64: string; mimeType: string } | null> {
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (asset.base64) return { base64: asset.base64, mimeType };
    if (asset.file) {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1] ?? '');
        r.onerror = () => reject(new Error('read failed'));
        r.readAsDataURL(asset.file);
      });
      return { base64: b64, mimeType };
    }
    return null;
  }
  ```
- On `!result.canceled`, call `getImageBase64(result.assets[0])` and pass to `onPicked` (or surface an error if null).

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/ReceiptImagePicker.tsx
git commit -m "feat: add receipt image capture via camera and gallery"
```

---

### Task 9: `AddTransactionSheet` + TabBar wiring + integration

**Files:**
- Create: `src/components/AddTransactionSheet.tsx`
- Modify: `src/components/TabBar.tsx`

**Interfaces:**
- Consumes: `ReceiptImagePicker`, `TransactionForm`, `analyzeReceipt` + `ReceiptAnalysisError`, `useTransactions`.
- Produces: `AddTransactionSheet` component with props `{ visible: boolean; onClose: () => void }`.

- [ ] **Step 1: Implement `src/components/AddTransactionSheet.tsx`**

Flow state: `'chooser' | 'capture' | 'analyzing' | 'form'`. Draft state: `ReceiptDraft | null`. Error state: `string | null`.

- Chooser: two options — "Scan receipt" (→ `capture`) and "Enter manually" (→ `form` with `draft = null`).
- Capture: render `ReceiptImagePicker`. On `onPicked` → set `analyzing`, call `analyzeReceipt(base64, mimeType)`; on success store the draft and go to `form`; on `ReceiptAnalysisError`, store the error and go to `form` with `draft = null` (so the user can still enter manually; show the error text above the form).
- Analyzing: a spinner (`ActivityIndicator`) with "Reading receipt…".
- Form: render `TransactionForm` with `initial={draft ?? undefined}`. On submit: `addTransaction(input)` then `onClose()` and reset state. On cancel: `onClose()`.
- Reset state whenever the sheet closes (in `onClose` wrapper or `useEffect` on `visible`).

Use `Modal` (transparent, slide) with a bottom-sheet card like `AddCategoryModal`.

- [ ] **Step 2: Wire the TabBar `+` button**

In `src/components/TabBar.tsx`, add state `const [sheetVisible, setSheetVisible] = useState(false)`. Change the `addButton` `onPress` to `setSheetVisible(true)`, and render `<AddTransactionSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />` at the end of the wrapper. (The `TabBar` is rendered inside the providers, so `useTransactions` is available.)

- [ ] **Step 3: Verify compile and end-to-end manual check**

Run: `npx tsc --noEmit` and `npm test`.
Manual on web (`npm start`):
1. Tap `+` → chooser appears.
2. "Enter manually" → fill name/amount/category, add a line item, save → transaction appears in Home and the row expands to show the item.
3. "Scan receipt" → pick an image → if env is unset, an inline "Vision backend is not configured" error shows and the blank form is usable; if a backend is configured, the form pre-fills from the response.

- [ ] **Step 4: Commit**

```bash
git add src/components/AddTransactionSheet.tsx src/components/TabBar.tsx
git commit -m "feat: wire add-transaction flow into the tab bar plus button"
```

---

## Self-Review Notes

- Spec §2 flow (chooser → scan/manual → editable form → save) → Task 9 + Task 6.
- Spec §3 data model (LineItem, Transaction fields, TransactionsContext, category reconciliation) → Task 2.
- Spec §4 service + env config → Task 3 + Task 4.
- Spec §5 backend contract → encoded in `analyzeReceipt` (Task 4) and `.env.example` (Task 3); backend itself is a separate repo (out of scope).
- Spec §6 UI components → Tasks 6, 7, 8, 9.
- Spec §7 deps/errors/testing → Task 1 (jest), Task 5 (picker), error fallback in Tasks 4/9.
