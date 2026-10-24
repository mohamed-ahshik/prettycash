# Auto-Categorize Receipts (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send eligible expense categories with receipt scans, preselect Gemini’s category (or Uncategorized), and add the profile toggle, category description/edit UI, and Supabase schema.

**Architecture:** Extend the existing categories/profile repositories and types, add a pure category-selection helper, thread options through `analyzeReceipt`, and wire the profile setting + categories into `AddTransactionSheet`. The migration adds `profiles.auto_categorize` and `categories.is_uncategorized` plus one Uncategorized row per existing user.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, TypeScript, Supabase, Jest 29 + jest-expo.

**Spec:** `docs/superpowers/specs/2026-10-24-auto-categorization-design.md`

**Implementation status:** Implemented — all tasks complete; 127 frontend tests and `tsc` pass. Manual on-device checks outstanding.

## Global Constraints

- `npm test` and `npx tsc --noEmit` must pass after every task.
- No new dependencies.
- Use the existing repository/context patterns; no new global context.
- Category payload: expense only, exclude `isUncategorized`, max 50, description max 200.
- Profile setting defaults to ON when missing or unreadable.
- Manual transaction category behavior is unchanged.
- No comments in code.

---

### Task 1: Schema, types, mappers, repositories

**Files:**
- Create: `supabase/migrations/20261024000000_add_auto_categorize_and_uncategorized.sql`
- Modify: `src/types/category.ts`, `src/types/profile.ts`, `src/types/index.ts`
- Modify: `src/data/repositories/mappers.ts`
- Modify: `src/data/repositories/categoriesRepo.ts`
- Modify: `src/data/repositories/profileRepo.ts`
- Modify: `src/data/repositories/__tests__/mappers.test.ts`
- Modify: `src/data/repositories/__tests__/transactionsRepo.test.ts` only if its profile fixture is exact (add `autoCategorize: true`).

- [ ] **Step 1: Add the migration**

```sql
alter table public.profiles
  add column if not exists auto_categorize boolean not null default true;

alter table public.categories
  add column if not exists is_uncategorized boolean not null default false;

create unique index if not exists categories_one_uncategorized_per_user
  on public.categories (user_id)
  where is_uncategorized;

insert into public.categories (
  user_id, name, type, icon, color_bg, color_fg, notes, sort_order, is_uncategorized
)
select
  p.user_id,
  'Uncategorized',
  'expense',
  'help-circle-outline',
  '#F3F4F6',
  '#6B7280',
  'Receipts with no clear category',
  999,
  true
from public.profiles p
where not exists (
  select 1
  from public.categories c
  where c.user_id = p.user_id
    and c.is_uncategorized
);
```

- [ ] **Step 2: Extend types**

`src/types/category.ts`:

```ts
export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  colorBg: string;
  colorFg: string;
  notes?: string;
  isUncategorized?: boolean;
}
```

`src/types/profile.ts` add `autoCategorize: boolean;` to `UserProfile`.

`src/types/index.ts` add to `ReceiptDraft`:

```ts
categoryId?: string;
categoryConfidence?: number;
```

- [ ] **Step 3: Update mappers and repositories**

`mapCategoryRow` adds `isUncategorized: row.is_uncategorized === true`.
`mapProfileRow` adds `autoCategorize: row.auto_categorize ?? true`.
`upsertProfile` includes `auto_categorize: profile.autoCategorize`.
`insertCategory` includes `is_uncategorized: input.isUncategorized ?? false`.
Add:

```ts
export async function updateCategory(
  id: string,
  input: Pick<CategoryItem, 'name' | 'notes'>,
): Promise<CategoryItem> {
  const { data, error } = await supabase.from('categories')
    .update({ name: input.name, notes: input.notes ?? null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCategoryRow(data);
}
```

- [ ] **Step 4: Update mapper tests**

```ts
expect(mapCategoryRow({ id: '1', name: 'Food', type: 'expense', icon: 'cart-outline', color_bg: '#DFF0EB', color_fg: '#00674F', notes: 'x', is_uncategorized: true }))
  .toEqual({ id: '1', name: 'Food', type: 'expense', icon: 'cart-outline', colorBg: '#DFF0EB', colorFg: '#00674F', notes: 'x', isUncategorized: true });

expect(mapProfileRow({ name: 'Maya', email: 'm@x.co', currency: 'USD ($)', notifications_enabled: true, haptics_enabled: false, member_since: 'Sep 2026' }))
  .toMatchObject({ autoCategorize: true });
expect(mapProfileRow({ auto_categorize: false }).autoCategorize).toBe(false);
```

- [ ] **Step 5: Run checks and commit**

```bash
npx tsc --noEmit
npm test -- --runInBand
git add supabase/migrations/20261024000000_add_auto_categorize_and_uncategorized.sql src/types src/data/repositories
git commit -m "feat: add auto-categorize schema and repository fields"
```

---

### Task 2: Seeding Uncategorized and missing defaults

**Files:**
- Modify: `src/data/seed.ts`
- Modify: `src/data/__tests__/seed.test.ts`

- [ ] **Step 1: Add the default**

Append to `DEFAULT_EXPENSE_CATEGORIES`:

```ts
{ name: 'Uncategorized', type: 'expense', icon: 'help-circle-outline', colorBg: '#F3F4F6', colorFg: '#6B7280', notes: 'Receipts with no clear category', isUncategorized: true },
```

- [ ] **Step 2: Replace `seedDefaultCategoriesIfNeeded`**

```ts
export async function seedDefaultCategoriesIfNeeded(): Promise<boolean> {
  if (await isSeeded()) return false;
  const existing = await listCategories();
  const hasUncategorized = existing.some((c) => c.isUncategorized);
  const all = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  for (const cat of all) {
    if (cat.isUncategorized && hasUncategorized) continue;
    const present = existing.some((c) => c.type === cat.type && c.name === cat.name);
    if (!present) await insertCategory(cat);
  }
  await setSeeded(true);
  return true;
}
```

- [ ] **Step 3: Update seed tests**

```ts
it('seeds defaults for a user who only has the migrated Uncategorized row', async () => {
  mockSeeded.mockResolvedValue(false);
  mockList.mockResolvedValue([
    { id: 'u1', name: 'Uncategorized', type: 'expense', icon: 'help-circle-outline', colorBg: '#F3F4F6', colorFg: '#6B7280', isUncategorized: true },
  ]);
  await seedDefaultCategoriesIfNeeded();
  const names = (insertCategory as jest.Mock).mock.calls.map(([c]) => c.name);
  expect(names).not.toContain('Uncategorized');
  expect(names).toContain('Food');
  expect(mockSetSeeded).toHaveBeenCalledWith(true);
});

it('does not add a second Uncategorized row', async () => {
  mockSeeded.mockResolvedValue(false);
  mockList.mockResolvedValue([
    { id: 'u1', name: 'Uncategorized', type: 'expense', icon: 'help-circle-outline', colorBg: '#F3F4F6', colorFg: '#6B7280', isUncategorized: true },
  ]);
  await seedDefaultCategoriesIfNeeded();
  expect((insertCategory as jest.Mock).mock.calls.filter(([c]) => c.isUncategorized)).toHaveLength(0);
});
```

- [ ] **Step 4: Run checks and commit**

```bash
npx tsc --noEmit && npm test -- --runInBand
git add src/data/seed.ts src/data/__tests__/seed.test.ts
git commit -m "feat: seed Uncategorized and missing default categories"
```

---

### Task 3: Category editing and description UI

**Files:**
- Modify: `src/components/AddCategoryModal.tsx`
- Modify: `src/components/CategoryRow.tsx`
- Modify: `src/screens/CategoriesScreen.tsx`
- Modify: `src/context/CategoriesContext.tsx`

- [ ] **Step 1: Extend `AddCategoryModal`**

Add props `initial?: CategoryItem`. Initialize `name`, `notes`, icon, color from `initial` when the modal opens. When `initial` is present:
- Title `Edit Category`, submit `Save Changes`.
- Hide the icon and color pickers; keep type/icon/color from `initial`.
- `handleSave` calls `onSave({ name: name.trim(), type: initial.type, notes: notes.trim() || undefined, icon: initial.icon, colorBg: initial.colorBg, colorFg: initial.colorFg })`.
Add `maxLength={80}` to the name input and `maxLength={200}` to the description input. Relabel `Notes (optional)` to `Description (optional)`, placeholder `What belongs here? e.g. Groceries, dining out`.

- [ ] **Step 2: Add `updateCategory` to the context**

```ts
interface CategoriesContextType {
  // ...
  updateCategory: (id: string, patch: Pick<CategoryItem, 'name' | 'notes'>) => Promise<void>;
}
```

```ts
const updateCategory = async (id: string, patch: Pick<CategoryItem, 'name' | 'notes'>) => {
  const updated = await repoUpdateCategory(id, patch);
  if (updated.type === 'expense') {
    setExpenseCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  } else {
    setIncomeCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }
};
```

Import the repository function as `updateCategory as repoUpdateCategory`.

- [ ] **Step 3: Make rows tappable and wire the edit modal**

`CategoryRow` accepts `onPress?: () => void`; wrap the row in `Pressable` with `onPress` and keep the existing layout.

`CategoriesScreen`:
```ts
const [editing, setEditing] = useState<CategoryItem | null>(null);
const { expenseCategories, incomeCategories, addCategory, updateCategory } = useCategories();
// ...
<CategoryRow key={item.id} item={item} isFirst={index === 0} onPress={() => setEditing(item)} />
// ...
<AddCategoryModal
  visible={modalVisible || editing !== null}
  type={editing?.type ?? activeType}
  initial={editing ?? undefined}
  onClose={() => { setModalVisible(false); setEditing(null); }}
  onSave={(item) => {
    const action = editing ? updateCategory(editing.id, { name: item.name, notes: item.notes }) : addCategory(item);
    action.catch(() => {});
  }}
/>
```

- [ ] **Step 4: Run checks and commit**

```bash
npx tsc --noEmit && npm test -- --runInBand
git add src/components/AddCategoryModal.tsx src/components/CategoryRow.tsx src/screens/CategoriesScreen.tsx src/context/CategoriesContext.tsx
git commit -m "feat: edit category name and description"
```

---

### Task 4: Profile auto-categorize toggle

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `App.tsx` (new-profile upsert only)

- [ ] **Step 1: Add the setting row**

Under Haptic Feedback, add a row with icon `tag-multiple-outline`, label `Auto-categorize receipts`, helper text `Gemini picks one of your expense categories from the receipt.`, and a `Switch` bound to `profile.autoCategorize`:

```tsx
<Switch
  value={profile.autoCategorize}
  onValueChange={(val) => {
    hapticSelection();
    updateProfile({ autoCategorize: val });
  }}
  trackColor={{ false: colors.border, true: colors.secondary }}
  thumbColor={profile.autoCategorize ? colors.primary : '#FFFFFF'}
/>
```

Add `settingHint` style (12px, mutedForeground) and wrap the label in a `View` so the hint sits under it.

- [ ] **Step 2: Include the default in new-profile creation**

In `App.tsx` `upsertProfile({...})`, add `autoCategorize: true`.

- [ ] **Step 3: Run checks and commit**

```bash
npx tsc --noEmit && npm test -- --runInBand
git add src/screens/ProfileScreen.tsx App.tsx
git commit -m "feat: add auto-categorize profile setting"
```

---

### Task 5: Receipt API options and normalization

**Files:**
- Modify: `src/services/receiptAnalysis.ts`
- Modify: `src/services/__tests__/receiptAnalysis.test.ts`

- [ ] **Step 1: Add options and body fields**

```ts
export interface AnalyzeOptions {
  autoCategorize?: boolean;
  categories?: { id: string; name: string; description: string }[];
}

export async function analyzeReceipt(
  imageBase64: string,
  mimeType: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzedReceipt> {
  // after config guard:
  const body: Record<string, unknown> = {
    image: { base64: imageBase64, mimeType },
    autoCategorize: Boolean(options.autoCategorize && options.categories?.length),
  };
  if (options.autoCategorize && options.categories?.length) {
    body.categories = options.categories;
  }
  // use JSON.stringify(body) in the POST
}
```

- [ ] **Step 2: Normalize category fields**

```ts
categoryId: typeof d.categoryId === 'string' ? d.categoryId : undefined,
categoryConfidence: typeof d.categoryConfidence === 'number' ? d.categoryConfidence : undefined,
```

- [ ] **Step 3: Tests**

Add tests asserting the enqueue body for on/off, and:

```ts
expect(normalizeReceiptDraft({ amount: 1, categoryId: 'cat-1', categoryConfidence: 0.9 }))
  .toMatchObject({ categoryId: 'cat-1', categoryConfidence: 0.9 });
expect(normalizeReceiptDraft({ amount: 1, categoryId: 2, categoryConfidence: 'x' }))
  .toMatchObject({ categoryId: undefined, categoryConfidence: undefined });
```

- [ ] **Step 4: Run checks and commit**

```bash
npx tsc --noEmit && npm test -- --runInBand
git add src/services/receiptAnalysis.ts src/services/__tests__/receiptAnalysis.test.ts
git commit -m "feat: send category options with receipt analysis"
```

---

### Task 6: Category payload and initial-category helpers

**Files:**
- Create: `src/utils/categorySelection.ts`
- Create: `src/utils/__tests__/categorySelection.test.ts`

- [ ] **Step 1: Add the helpers**

```ts
import { CategoryItem, ReceiptDraft } from '../types';

export function buildCategoryPayload(categories: CategoryItem[]) {
  return categories
    .filter((c) => c.type === 'expense' && !c.isUncategorized)
    .slice(0, 50)
    .map((c) => ({ id: c.id, name: c.name, description: (c.notes ?? '').slice(0, 200) }));
}

export function selectInitialCategoryId(
  draft: Pick<ReceiptDraft, 'categoryId'> | null | undefined,
  expenseCategories: CategoryItem[],
): string | undefined {
  const fallback = expenseCategories.find((c) => c.isUncategorized) ?? expenseCategories[0];
  return draft?.categoryId && expenseCategories.some((c) => c.id === draft.categoryId)
    ? draft.categoryId
    : fallback?.id;
}
```

- [ ] **Step 2: Tests**

```ts
it('excludes Uncategorized, caps at 50, and truncates descriptions', () => {
  const categories = Array.from({ length: 51 }, (_, i) => ({
    id: `c${i}`, name: `C${i}`, type: 'expense' as const, icon: 'x', colorBg: '#fff', colorFg: '#000',
    notes: 'x'.repeat(201), isUncategorized: i === 0,
  }));
  const payload = buildCategoryPayload(categories);
  expect(payload).toHaveLength(50);
  expect(payload[0].id).toBe('c1');
  expect(payload[0].description).toHaveLength(200);
});

it('uses the draft category only when it is still valid', () => {
  const cats = [
    { id: 'u', name: 'Uncategorized', type: 'expense' as const, icon: 'x', colorBg: '#fff', colorFg: '#000', isUncategorized: true },
    { id: 'f', name: 'Food', type: 'expense' as const, icon: 'x', colorBg: '#fff', colorFg: '#000' },
  ];
  expect(selectInitialCategoryId({ categoryId: 'f' }, cats)).toBe('f');
  expect(selectInitialCategoryId({ categoryId: 'gone' }, cats)).toBe('u');
  expect(selectInitialCategoryId(null, cats)).toBe('u');
});
```

- [ ] **Step 3: Run checks and commit**

```bash
npx tsc --noEmit && npm test -- --runInBand
git add src/utils/categorySelection.ts src/utils/__tests__/categorySelection.test.ts
git commit -m "feat: add category payload and selection helpers"
```

---

### Task 7: Wire the scan flow and form

**Files:**
- Modify: `src/components/AddTransactionSheet.tsx`
- Modify: `src/components/TransactionForm.tsx` only if the initial category needs to react to category loading.

- [ ] **Step 1: Read the profile setting on open**

```ts
const { expenseCategories } = useCategories();
const [autoCategorize, setAutoCategorize] = useState(true);
const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);

useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  getProfile()
    .then((p) => { if (!cancelled) setAutoCategorize(p?.autoCategorize ?? true); })
    .catch(() => { if (!cancelled) setAutoCategorize(true); });
  return () => { cancelled = true; };
}, [visible]);
```

Reset `initialCategoryId` when the sheet closes.

- [ ] **Step 2: Build the payload and call the service**

In `handlePicked`, before `analyzeReceipt`:

```ts
const categories = buildCategoryPayload(expenseCategories);
const shouldAutoCategorize = autoCategorize && categories.length > 0;
const { draft: result, raw } = await analyzeReceipt(base64, mimeType, {
  autoCategorize: shouldAutoCategorize,
  categories: shouldAutoCategorize ? categories : [],
});
```

After success and in the catch, set the initial category:

```ts
setInitialCategoryId(selectInitialCategoryId(result, expenseCategories) ?? null);
```

For the catch, call `selectInitialCategoryId(null, expenseCategories)`. For `handleManual`, set `initialCategoryId` to `null`.

- [ ] **Step 3: Pass it to the form**

```tsx
<TransactionForm
  initial={draft ?? undefined}
  initialCategoryId={initialCategoryId ?? undefined}
  receiptDate={draft?.date}
  error={error ?? undefined}
  onSubmit={handleSubmit}
  onCancel={onClose}
/>
```

- [ ] **Step 4: Run checks and commit**

```bash
npx tsc --noEmit && npm test -- --runInBand
git add src/components/AddTransactionSheet.tsx src/components/TransactionForm.tsx
git commit -m "feat: preselect the scanned receipt category"
```

---

### Task 8: Apply the migration, update docs, final verification

- [ ] **Step 1: Apply the migration to the linked Supabase project**

```bash
npx supabase db query --linked --yes "$(cat supabase/migrations/20261024000000_add_auto_categorize_and_uncategorized.sql)"
npx supabase db query --linked --yes "insert into supabase_migrations.schema_migrations (version, name) values ('20261024000000', 'add_auto_categorize_and_uncategorized') on conflict (version) do nothing;"
```

Verify:

```bash
npx supabase db query --linked --yes "select column_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='auto_categorize';"
npx supabase db query --linked --yes "select count(*) from public.categories where is_uncategorized;"
```

- [ ] **Step 2: Update the spec status**

Set `**Implementation status:** Implemented` in `docs/superpowers/specs/2026-10-24-auto-categorization-design.md` and note the manual checks outstanding.

- [ ] **Step 3: Final verification**

```bash
npx tsc --noEmit
npm test -- --runInBand
```

Manual: toggle ON/OFF, scan, edit a category description, rename Uncategorized, verify form preselection.

**Implementation status:** Implemented.
