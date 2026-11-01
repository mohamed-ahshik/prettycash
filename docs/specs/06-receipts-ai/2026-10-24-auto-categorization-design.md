---
title: "Auto-Categorize Receipts"
type: spec
status: approved
date: 2026-10-24
section: receipts
tags:
  - prettycash
  - spec
  - receipts
  - categories
  - gemini
---

# PrettyCash Mobile — Auto-Categorize Receipts (Design)

**Date:** 2026-10-24
**Status:** Approved for implementation
**Implementation status:** Implemented — migration applied, backend contract live, and frontend wiring complete. Manual on-device checks from §11.2 are outstanding.

---

## 1. Overview & Objective

When the user scans a receipt and the auto-categorize setting is ON, the app sends the user’s
expense categories with the image. The backend uses Gemini to choose one category and returns its
ID plus a confidence score. The transaction form preselects that category, and the user can change
it.

When the setting is OFF, Gemini finds no confident match, or the returned category is no longer
valid, the form preselects the user’s real **Uncategorized** expense category. The user can always
choose another category.

This is the frontend half of the backend spec at:

`PrettyCash-Backend/docs/specs/02-ai-providers/2026-10-24-auto-categorization-design.md`

---

## 2. Decisions Locked During Brainstorming

| Decision | Value |
|---|---|
| Default categories | Per-user copies, seeded by the app |
| Description field | Reuse `categories.notes`; relabel UI as “Description” |
| Category editing | Edit name/description after creation; type/icon/color stay unchanged |
| Fallback category | Real **Uncategorized** expense category identified by `is_uncategorized` |
| Toggle | Profile setting `auto_categorize`, default ON |
| Eligible categories | Expense only, excluding Uncategorized |
| Request payload | `autoCategorize` + up to 50 categories (`id`, `name`, `description`) |
| Result | `categoryId` + optional `categoryConfidence` |
| No match / off | Preselect Uncategorized; user can change |
| Category limits | 50 categories, 200-char description |
| Toggle scope | Receipt scans only; manual transactions unchanged |

---

## 3. Scope

**In scope**

- Supabase migration for `profiles.auto_categorize` and `categories.is_uncategorized`.
- Backfill/seed of the Uncategorized expense category.
- Profile Settings toggle.
- Category description label and category edit UI for name/description.
- Sending expense categories with `analyzeReceipt`.
- Receipt draft normalization for `categoryId` / `categoryConfidence`.
- Preselecting the Gemini category or Uncategorized in `TransactionForm`.
- Tests and documentation updates.

**Out of scope**

- Any backend or Gemini prompt change.
- Global/shared categories.
- Income/refund receipt categorization.
- Per-line-item categories.
- Category deletion.
- Category usage statistics or confidence UI.
- JWT/backend authentication changes.

---

## 4. Cross-Repo Contract

### 4.1 Request

`analyzeReceipt(imageBase64, mimeType, options)` sends:

```json
{
  "image": { "base64": "...", "mimeType": "image/jpeg" },
  "autoCategorize": true,
  "categories": [
    { "id": "uuid-food", "name": "Food", "description": "Groceries & dining" }
  ]
}
```

- Sends `autoCategorize: false` and omits `categories` when:
  - the profile toggle is off,
  - categories are still loading,
  - categories failed to load, or
  - there are no eligible categories.
- Sends at most 50 expense categories, excluding `isUncategorized`.
- Truncates each description to 200 characters.
- Existing calls without options still send only the image and keep working.

### 4.2 Response

Completed jobs may include:

```json
{
  "status": "completed",
  "result": {
    "merchant": "CORNER STORE",
    "amount": 12.34,
    "categoryId": "uuid-food",
    "categoryConfidence": 0.86,
    "note": "",
    "items": []
  }
}
```

`categoryId` is absent when Gemini had no confident match or auto-categorization was off.
`categoryConfidence` is informational and is not shown in the UI.

---

## 5. Data Changes

### 5.1 Migration

Create `supabase/migrations/20261024000000_add_auto_categorize_and_uncategorized.sql`:

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

- Existing RLS policies continue to scope rows by `user_id`.
- The unique partial index guarantees one Uncategorized row per user.
- Existing users are backfilled; new users get it through the seed.

### 5.2 Type and mapper changes

`CategoryItem`:

```ts
export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  colorBg: string;
  colorFg: string;
  notes?: string;          // displayed and sent as description
  isUncategorized?: boolean;
}
```

`UserProfile`:

```ts
export interface UserProfile {
  // ...
  autoCategorize: boolean;
}
```

Mappers:

- `mapCategoryRow`: `isUncategorized: row.is_uncategorized === true`.
- `mapProfileRow`: `autoCategorize: row.auto_categorize ?? true`.

`profileRepo.upsertProfile` includes `auto_categorize: profile.autoCategorize`.
`categoriesRepo.insertCategory` includes `is_uncategorized: input.isUncategorized ?? false`.

### 5.3 Seed behavior

- Add Uncategorized to the default expense categories with `isUncategorized: true`.
- Update `seedDefaultCategoriesIfNeeded` so that:
  - when `seeded` is false, insert every default whose `(type, name)` is not already present,
  - a user with only the migration-inserted Uncategorized row receives the other defaults,
  - the Uncategorized row is never inserted twice (unique index / flag check),
  - new users receive all defaults including Uncategorized,
  - `seeded` is set after the defaults are created.
- Once `seeded` is true, do not re-add defaults that the user renamed later.
- Do not create a second Uncategorized category through the Add Category UI; the flag is
  seed/migration-only.

---

## 6. Profile Setting

- Add an “Auto-categorize receipts” switch under Settings in `ProfileScreen`.
- Default: ON (`auto_categorize` column default true; mapper also defaults true).
- Helper text: “Gemini picks one of your expense categories from the receipt.”
- The setting persists through `upsertProfile`.
- The scan flow reads the setting with `getProfile()` when the receipt sheet opens/starts a scan;
  if the profile cannot be read, default to ON. No new global context is required for this feature.
- The toggle affects receipt scans only. Manual transactions keep their current default category.

---

## 7. Category Description and Editing

- Rename the Add Category “Notes” label to “Description”.
- Placeholder: “What belongs here? e.g. Groceries, dining out”.
- Enforce `maxLength={80}` on the name and `maxLength={200}` on the description.
- Trim leading/trailing whitespace before saving.
- Add edit mode to `AddCategoryModal`:
  - Prefill name and description.
  - Title “Edit Category”; submit “Save Changes”.
  - Only name and description are editable; type, icon, and colors stay unchanged.
- Add `updateCategory(id, { name, notes })` to `categoriesRepo`.
- Add `updateCategory` to `CategoriesContext` and replace the category in the correct expense/income
  list.
- Make a category row/card open the edit modal in `CategoriesScreen`.
- The Uncategorized row is a normal editable row for name/description; its `isUncategorized` flag
  and expense type never change.
- Do not add delete in this feature.

---

## 8. Scan Flow

In `AddTransactionSheet`:

1. Load the profile setting and category context.
2. Build the category payload only when auto-categorize is ON and categories are available:
   - `expenseCategories`
   - exclude `isUncategorized`
   - sort is already provided by `listCategories`
   - take the first 50
   - map to `{ id, name, description: notes ?? '' }`
   - truncate descriptions to 200 chars
3. Call:

```ts
analyzeReceipt(base64, mimeType, {
  autoCategorize: shouldAutoCategorize,
  categories: shouldAutoCategorize ? categories : [],
});
```

4. Normalize the returned draft with `categoryId` and optional `categoryConfidence`.
5. Choose the form’s initial category:

```ts
const fallback =
  expenseCategories.find((c) => c.isUncategorized) ?? expenseCategories[0];

const initialCategoryId =
  draft?.categoryId && expenseCategories.some((c) => c.id === draft.categoryId)
    ? draft.categoryId
    : fallback?.id;
```

6. Pass `initialCategoryId` to `TransactionForm`.

`TransactionForm` already accepts `initialCategoryId`; it will preselect the value and the user can
change it. If no category exists at all, the form keeps its current empty/first-category behavior.

---

## 9. Receipt Normalization

`ReceiptDraft` adds:

```ts
categoryId?: string;
categoryConfidence?: number;
```

`normalizeReceiptDraft` reads them defensively:

```ts
categoryId: typeof d.categoryId === 'string' ? d.categoryId : undefined,
categoryConfidence: typeof d.categoryConfidence === 'number'
  ? d.categoryConfidence
  : undefined,
```

Unknown/extra fields remain ignored. The raw response is still stored in `receiptData`.

---

## 10. API Client Change

`src/services/receiptAnalysis.ts`:

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
  const body: Record<string, unknown> = {
    image: { base64: imageBase64, mimeType },
  };
  if (options.autoCategorize && options.categories?.length) {
    body.autoCategorize = true;
    body.categories = options.categories;
  } else {
    body.autoCategorize = false;
  }
  // POST body to /analyze-receipt
}
```

Existing tests and callers that omit options continue to send `autoCategorize: false`.

---

## 11. Testing

### 11.1 Unit tests

- `receiptAnalysis.test.ts`
  - Sends `autoCategorize: true` + categories when provided.
  - Sends `autoCategorize: false` and no categories when off/empty.
  - Normalizes `categoryId` and `categoryConfidence`.
  - Ignores invalid category field types.
- `categoriesRepo` / mapper tests
  - insert includes `is_uncategorized`.
  - update sends name/description.
  - mapper reads `is_uncategorized`.
- `profileRepo` / mapper tests
  - upsert includes `auto_categorize`.
  - mapper defaults true for missing values.
- Seed tests
  - New user gets the defaults plus Uncategorized.
  - Existing user with only Uncategorized gets the remaining defaults.
  - No duplicate Uncategorized.
- Pure helper tests for category payload/filtering and initial category selection:
  - excludes Uncategorized,
  - caps at 50,
  - truncates descriptions,
  - uses Gemini category when valid,
  - falls back to Uncategorized when missing/invalid/off.
- `TransactionForm` / `AddTransactionSheet` tests if the test setup supports component testing; otherwise
  extract the selection logic into a pure helper and test that.

### 11.2 Verification

```bash
npm test
npx tsc --noEmit
```

Manual:
- Toggle ON, scan a clear Food receipt → Food preselected.
- Toggle ON, scan an ambiguous receipt → Uncategorized preselected.
- Toggle OFF, scan → Uncategorized preselected, no category payload sent.
- Edit a category description → the next scan sends the updated description.
- Rename the Uncategorized category → fallback still works.
- Add 51 categories → only 50 are sent (or the limit is handled as specified).
- Delete/rename a category after a scan but before saving → invalid ID falls back to Uncategorized.

---

## 12. Rollout

1. Backend auto-categorization must be deployed first; it is backward compatible.
2. Apply the frontend Supabase migration.
3. Release the frontend with the profile toggle and category changes.
4. Verify existing users have Uncategorized and the profile default is true.
5. Monitor backend category acceptance/fallback and user overrides.

No backend migration is required. The frontend migration must be applied before the new app build
expects the new columns.

---

## 13. Acceptance Criteria

1. `profiles.auto_categorize` exists and defaults true.
2. Every user has exactly one Uncategorized expense category.
3. Category creation and editing expose a Description field backed by `notes`.
4. With the toggle ON, scans send expense categories excluding Uncategorized.
5. A valid Gemini `categoryId` preselects that category in the form.
6. Missing/invalid/below-threshold categories preselect Uncategorized.
7. With the toggle OFF, no category payload is sent and Uncategorized is preselected.
8. The user can change the category before saving.
9. Existing manual transaction behavior is unchanged.
10. `npm test` and `npx tsc --noEmit` pass.

---

## 14. Risks and Open Items

- **Confidence calibration:** the backend threshold is only as good as Gemini’s self-reported
  confidence; user overrides are the real feedback signal.
- **Privacy:** category names/descriptions are sent to Gemini. They can be sensitive.
- **Per-user defaults:** changing a seeded default later does not update existing users.
- **Category cap:** users with more than 50 expense categories will not have all categories
  considered; the app should make this behavior explicit or keep the cap high enough.
- **Prompt injection:** category descriptions are user-controlled; the backend constrains the
  output to category keys.
- **Profile read failure:** if the profile cannot be loaded during a scan, the app defaults the
  setting to ON; categories are still sent only if they loaded.
- **Category deletion:** not supported in this feature, so saved transactions retain category IDs.
- **Uncategorized identification:** relies on `is_uncategorized`; the flag must never be set by the
  normal Add Category flow.

---

## 15. Out of Scope

- Backend contract/prompt/queue changes (backend spec).
- Global category defaults and synchronization.
- Income/refund receipts.
- Per-line-item categories.
- Category deletion.
- AI confidence display or explanation UI.
- Category usage analytics.
- JWT/backend auth changes.
