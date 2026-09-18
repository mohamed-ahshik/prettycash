# PrettyCash — Insights: Combined Income/Expense Donut (Spec)

**Date:** 2026-09-18
**Status:** Approved for implementation
**Implementation status:** Implemented

---

## 1. Overview & Objective

Today Insights shows **one type at a time** (a toggle) and its donut/legend/breakdown show only that type. Redesign it so the donut tells the whole monthly story at a glance:

- **Default (combined):** a single ring with two arcs — **Expense (red)** and **Income (green)** — sized by the month's totals.
- **Tap a segment** (or its legend row) to **drill in**: the ring shows that type's categories using each category's own colour.
- **Tap again** to return to the combined view.
- **Below the donut**, always list **Income** and **Expense** category breakdowns.

Insights keeps its **own selected month** (independent of Home), defaulting to the current month.

---

## 2. Interaction

State in `InsightsScreen`: `drill: 'expense' | 'income' | null` (`null` = combined).

**Combined (`drill === null`)**
- Arcs: `Expense` (`colors.expenseText`, red) and `Income` (`colors.incomeText`, green), each sized by `total / (expenseTotal + incomeTotal)`.
- Tapping an arc calls `onDrill('expense' | 'income')`.
- Center: hint text `Tap a segment`, no amount. Center tap does nothing.
- Legend: `Expense <x>%` (red) and `Income <y>%` (green); **legend rows are also tappable** to drill in (critical because a small total yields a near-zero arc that is hard to tap).

**Drilled (`drill === 'expense' | 'income'`)**
- Arcs: that type's `items`, each `item.color` (category colour), sized by `item.percentage`.
- Center: title (`Expenses`/`Income`) + the type total.
- **Tap the center (ring) again to return to combined** (`onDrill(null)`).
- Legend: that type's category rows.

---

## 3. Data

`src/utils/insights.ts` (replaces `getInsightsData`):

```ts
export interface TypeBreakdown { total: number; items: CategoryBreakdownItem[]; }
export interface InsightsMonthData { expense: TypeBreakdown; income: TypeBreakdown; }

export function getInsightsMonthData(
  transactions: Transaction[],
  categories: CategoryItem[],
  ym: string,
): InsightsMonthData;
```
- Computes both types via the existing `categoryBreakdown(transactions, categories, type, ym)`.

`src/utils/aggregate.ts` adds:

```ts
export function combinedShares(
  expenseTotal: number,
  incomeTotal: number,
): { expense: number; income: number };
```
- Returns the two percentages (1 decimal, `round1`); when both totals are `0`, returns `{ expense: 0, income: 0 }` (no division).

---

## 4. Components

### 4.1 `DonutChart` — rewritten to be data-driven
Props:
```ts
interface DonutChartProps {
  expense: TypeBreakdown;
  income: TypeBreakdown;
  drill: 'expense' | 'income' | null;
  onDrill: (drill: 'expense' | 'income' | null) => void;
}
```
- Builds `segments` from `drill`:
  - combined → `[{ color: expenseText, percentage: shares.expense, onPress: () => onDrill('expense') }, { color: incomeText, percentage: shares.income, onPress: () => onDrill('income') }]`.
  - drilled → that type's `items` mapped to `{ color: item.color, percentage: item.percentage }` (no per-arc press).
- Renders arcs with `strokeDasharray`/`strokeDashoffset` (as today); arc `onPress` uses react-native-svg's touch support.
- Center `Pressable` (the existing hole): combined → static hint; drilled → calls `onDrill(null)`.
- Legend is also rendered by `DonutChart`; each legend row is a `Pressable` calling `onDrill(...)` in combined mode (inert while drilled).
- Empty (both totals `0`): render only the muted base ring, center hint `No data`, empty legend.

### 4.2 Lists below
- Reuse `BreakdownCard` twice: `type="income"` first, then `type="expense"` (Income section above Expense, per the requested order).
- Each section hides when its `items` is empty (avoid empty cards) — or shows the existing header with no rows; **hide** is chosen.

---

## 5. Screen wiring — `InsightsScreen.tsx`

- Keep its own `selectedMonth`/`selectedYear` (default current) and the month picker.
- Add `const [drill, setDrill] = useState<'expense' | 'income' | null>(null)`.
- Read all categories (`expenseCategories` + `incomeCategories`) and `transactions`.
- `const monthData = getInsightsMonthData(transactions, [...expenseCategories, ...incomeCategories], ym)`.
- Render `<DonutChart expense={monthData.expense} income={monthData.income} drill={drill} onDrill={setDrill} />`, then the two `BreakdownCard`s.
- Remove the old single-type toggle and `getInsightsData` usage.

When the month changes, `drill` resets to `null` (so a stale drill state doesn't linger).

---

## 6. Colors

- Combined arcs: `colors.expenseText` (#D9534F) / `colors.incomeText` (#2E7D32).
- Drilled arcs and list rows: existing per-category `color`/`bgColor`.

---

## 7. Testing

- Unit-test `getInsightsMonthData` (both totals/items for a month; empty month → zeros).
- Unit-test `combinedShares` (proportional split, rounding, both-zero guard).
- Existing `getInsightsData` tests updated/removed.
- `npx tsc --noEmit` and `npm test` must pass.
- Manual: combined arcs show red/green; tapping an arc or legend drills in with category colours; tapping the center returns; both lists render; changing month resets the drill.

---

## 8. Out of Scope

- Sharing the selected month with Home.
- Animating the drill transition.
- Tapping a category row to open a filtered transaction list.
- Percentages summing to exactly 100 on screen (rounding gaps acceptable).
