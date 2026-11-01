# 08 — Categories

Implementation status: Implemented

## Purpose

Own category management and the category vocabulary used by transactions, insights, and recurring schedules.

## Responsibilities

- List expense and income categories.
- Create categories with an icon, color pair, and optional notes.
- Rename categories and update notes.
- Maintain the special uncategorized category.
- Provide category metadata to transaction forms, rows, insights, and recurring items.
- Keep category state synchronized through `CategoriesContext`.

## Main files

- `src/screens/CategoriesScreen.tsx` — list and add/edit entry points.
- `src/components/CategoryRow.tsx` — category list row.
- `src/components/AddCategoryModal.tsx` — create/edit form.
- `src/components/CategoryAvatar.tsx` — category icon/color badge.
- `src/components/SegmentedControl.tsx` — expense/income tabs.
- `src/context/CategoriesContext.tsx` — state and CRUD.
- `src/data/repositories/categoriesRepo.ts` — Supabase category CRUD.
- `src/data/categoriesData.ts` — preset colors and icons.
- `src/utils/categoryColors.ts` — palette derivation/contrast.

## Data flow

```text
CategoriesContext
  → expenseCategories / incomeCategories
  → CategoriesScreen
  → AddCategoryModal
  → categoriesRepo.insertCategory / updateCategory
  → Supabase
  → context state update
```

## Category identity

- Transactions reference `category_id`.
- Recurring items can reference `category_id` and keep a snapshot of name/icon/colors.
- If a category is deleted, transaction/category and recurring references fall back according to their foreign-key/snapshot policy.
- The uncategorized sentinel is used by receipt categorization when no confident match exists.

## Boundaries

- Categories do not own transaction totals.
- Receipt auto-categorization chooses among these categories but is implemented in module 06.
- Recurring category selection is implemented in module 09.

## Related documentation

- [[2026-09-12-categories-screen-design]]
- [[2026-09-12-categories-screen]]
- [[architecture-index|Back to architecture index]]
