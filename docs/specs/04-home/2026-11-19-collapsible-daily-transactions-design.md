# PrettyCash — Collapsible Daily Transactions (Spec)

**Date:** 2026-11-19
**Status:** Approved
**Implementation status:** Implemented; device verification pending.

---

## 1. Overview & Objective

The Home screen's "Daily transactions" list currently renders every transaction for every date in the selected month. The list gets long and the dates blur together.

Make each date a collapsible section. Only one date is expanded at a time; every other date shows just its header.

---

## 2. Behavior

### 2.1 Default state

- When the Home screen opens, the **newest date** in the selected month is expanded.
- "Newest" is the first group returned by `groupTransactionsByDay` — `Today` for the current month, otherwise the latest date with transactions in that month.
- If the selected month has no transactions, the existing `EmptyState` renders and no list is shown.

### 2.2 Tapping

- Tapping a collapsed date header expands it and collapses the previously open date.
- Tapping the open date header collapses it, leaving every date collapsed.
- Tapping a transaction row still opens `EditTransactionSheet`; row behavior is unchanged.

### 2.3 Month changes

- Changing the month resets the open date to the newest date in the newly selected month.
- The open date is **not** persisted across app restarts.

### 2.4 Header content

Each date header shows:

- The existing day label (`Today`, `Yesterday`, or `Nov 17`).
- The day's net total, from the existing `TransactionGroup.total` (`income − expense`), formatted with the active currency.
- A chevron: `chevron-up` when expanded, `chevron-down` when collapsed.
- The total uses the muted foreground color, so a collapsed row reads as a summary rather than a transaction amount.

Sketch:

```text
Daily transactions
┌──────────────────────────────────┐
│ Today              −$42.30   ⌃  │
│   Groceries        −$18.40      │
│   Coffee            −$3.50      │
├──────────────────────────────────┤
│ Yesterday          −$27.00   ⌄  │
├──────────────────────────────────┤
│ Nov 17              $120.00  ⌄  │
└──────────────────────────────────┘
```

---

## 3. Scope

In scope:

- Home screen "Daily transactions" section.
- A stateful list wrapper that owns which date is open.
- A pressable header and conditional rows in `TransactionGroup`.
- Accessibility state for the expand/collapse control.

Out of scope:

- Changing `groupTransactionsByDay` or the data model.
- Persisting the expanded date.
- Insights, search, or any other transaction list.
- Collapsing groups in the edit sheet.
- New dependencies or animations beyond a chevron swap.

---

## 4. Data & State

No schema or repository changes. `TransactionGroup` already carries:

```ts
interface TransactionGroup {
  label: string;
  total: number;
  transactions: Transaction[];
}
```

State lives in a new presentational component, `DailyTransactionList`:

- `openLabel: string | null`, initialized to `groups[0]?.label ?? null`.
- `onToggle(label)` sets `openLabel` to `label`, or `null` when `label` is already open.
- If the currently open label disappears because its last transaction was deleted, fall back to `groups[0]?.label ?? null`.
- The component is keyed by the selected month (`ym`) in `HomeScreen`, so a month change remounts it with the newest date open.

---

## 5. Implementation

### 5.1 `src/components/TransactionGroup.tsx`

Add props:

```ts
interface TransactionGroupProps {
  group: TransactionGroupType;
  expanded: boolean;
  onToggle: () => void;
  onPressTransaction?: (t: Transaction) => void;
}
```

- Replace the static header `View` with a `Pressable` row.
- `accessibilityRole="button"` and `accessibilityState={{ expanded }}`.
- Render the total with `formatCurrency(group.total, symbol, decimals)` from `useCurrency()`.
- Render the chevron with the existing `Icon` component.
- Render `group.transactions` only when `expanded`.
- Keep the current `showDivider={index > 0}` behavior inside the expanded list.

### 5.2 `src/components/DailyTransactionList.tsx` (new)

```ts
interface DailyTransactionListProps {
  groups: TransactionGroupType[];
  onPressTransaction?: (t: Transaction) => void;
}
```

- Owns `openLabel` and the toggle/fallback logic from §4.
- Renders one `TransactionGroup` per group with `expanded={group.label === openLabel}`.

### 5.3 `src/screens/HomeScreen.tsx`

- Replace the `groups.map(...)` block with:

```tsx
<DailyTransactionList
  key={ym}
  groups={groups}
  onPressTransaction={setEditing}
/>
```

- Keep the existing `groups.length === 0` empty state.

---

## 6. Accessibility

- Header exposes `accessibilityRole="button"` and `accessibilityState={{ expanded }}`.
- The chevron is decorative; the expanded state carries the meaning.
- The total is part of the header's accessible label, so a collapsed date announces its net total.

---

## 7. Edge Cases

- **One date only:** starts expanded; tapping collapses it, leaving just the header.
- **Open date deleted:** the list opens the newest remaining date.
- **New transaction on a new date:** the new group is collapsed; the user's open date is preserved.
- **Currency change:** the header total re-renders through `useCurrency`.
- **Empty month:** unchanged `EmptyState`.
- **All dates collapsed:** valid; tapping any header opens it.

---

## 8. Verification

- Home opens with the newest date expanded and all others collapsed.
- Tapping another date expands it and collapses the previous date.
- Tapping the open date collapses it; no rows remain visible.
- Changing the month resets to the newest date in that month.
- Editing a transaction still opens the edit sheet from a row.
- Deleting the last transaction in the open date falls back to the newest remaining date.
- Income-only and expense-only days show the correct net total.
- `npx tsc --noEmit` and `npm test -- --runInBand` pass.

---

## 9. Implementation status

Implemented; device verification pending.
