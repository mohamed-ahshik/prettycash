# PrettyCash — Insights: Handling Many Categories (Spec)

**Date:** 2026-09-18
**Status:** Approved for implementation
**Implementation status:** Not started

---

## 1. Overview & Objective

The Insights donut drill-down and the lists below assume a small number of categories. With many categories the ring becomes unreadable (razor-thin slices, repeated colours, untappable arcs), the legend overflows, and the page becomes an endless scroll. This adds:

- **Top 6 + "Other"** capping on the drilled donut and its legend.
- **Collapsible Income/Expense sections** below.
- The donut stays a donut (no bar fallback).

The combined (Expense + Income) donut view is unchanged.

---

## 2. Donut capping

- When a drilled type has **> 6** categories, render the **top 6 by amount** plus a single **"Other"** slice that aggregates the remainder.
- The "Other" slice uses neutral colours (`colors.mutedForeground` / `colors.muted`) and the `dots-horizontal` icon; its percentage is its share of the type total.
- The legend mirrors the capping exactly (top 6 + Other).
- "Other" behaves like any other drilled slice on tap (i.e. tapping returns to the combined view — no separate drill).
- With ≤ 6 categories, nothing changes (no "Other" slice).

### 2.1 Helper — `src/utils/insights.ts`
```ts
export const MAX_DONUT_SLICES = 6;

export function capBreakdown(
  items: CategoryBreakdownItem[],
  max: number = MAX_DONUT_SLICES,
): CategoryBreakdownItem[];
```
- Returns `items` unchanged when `items.length <= max`.
- Otherwise returns `items.slice(0, max)` plus an aggregated `Other` item:
  - `id: 'other'`, `name: 'Other'`
  - `amount` = rounded sum of the remaining items
  - `percentage` = 1-decimal share of the type total
  - `icon: 'dots-horizontal'`, `color: colors.mutedForeground`, `bgColor: colors.muted`

(`CategoryBreakdownItem` is already sorted by amount descending by `categoryBreakdown`.)

---

## 3. Collapsible sections

`src/components/BreakdownCard.tsx` gains an optional `collapsible` prop; when set:

- The header becomes a `Pressable` showing the title (`Income list` / `Expenses list`), the category count, and a chevron (`chevron-up` expanded / `chevron-down` collapsed).
- Tapping toggles the rows.
- **Default: expanded.**
- When collapsed, only the header renders (no rows).
- When `collapsible` is falsy, behaviour is unchanged (header + all rows).

`InsightsScreen` passes `collapsible` to both sections and keeps the existing empty-section hiding (sections with no items are not rendered).

The sections always show the **full** list when expanded (no per-list cap).

---

## 4. Component wiring

- `src/components/DonutChart.tsx`: in the drilled branch, build arcs and legend from `capBreakdown(items)` instead of the raw `items`. The combined branch is untouched. The center total still uses the full type total.
- `src/screens/InsightsScreen.tsx`: pass `collapsible` to the two `BreakdownCard`s; lists continue to receive the **full** `monthData` items.

---

## 5. Testing

- Unit-test `capBreakdown`: passthrough at/below the cap; at 7+ items returns 6 + `Other` with the summed amount and correct id/name; percentage is the remaining share.
- `npx tsc --noEmit` and `npm test` must pass.
- Manual: with > 6 categories in a type, the drilled ring shows 6 slices + grey Other and the legend matches; collapsing each section hides its rows and re-expanding restores them.

---

## 6. Out of Scope

- Ranked-bar fallback for very crowded data.
- Pagination, search, or sorting controls for the category lists.
- Sharing the selected month with Home.
