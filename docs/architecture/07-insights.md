# 07 — Insights

Implementation status: Implemented

## Purpose

Own the monthly spending/income analysis screen: combined donut, drill-down by type/category, breakdown cards, long-list handling, and empty states.

## Responsibilities

- Select a month independently from Home.
- Aggregate expenses and income by category.
- Render a combined income/expense donut.
- Support drill-down into expense categories and income categories.
- Handle many categories by capping slices into “Other.”
- Render a visible empty ring when the selected breakdown has no data.
- Show collapsible category breakdown cards.

## Main files

- `src/screens/InsightsScreen.tsx` — screen composition and month selection.
- `src/components/DonutChart.tsx` — SVG donut, legend, center interaction.
- `src/components/BreakdownCard.tsx` — collapsible category list.
- `src/components/MonthPicker.tsx` / `MonthYearPickerModal.tsx` — month selection.
- `src/utils/insights.ts` — breakdown data and category capping.
- `src/utils/aggregate.ts` — combined shares and category aggregation.
- `src/utils/donut.ts` — polar coordinates, segment angles, sector paths.
- `src/utils/categoryColors.ts` — derived light/dark category colors.

## Data flow

```text
TransactionsContext + CategoriesContext
  → getInsightsMonthData(transactions, categories, YYYY-MM)
  → TypeBreakdown { total, items }
  → combinedShares(expense, income)
  → DonutChart
  → BreakdownCard[]
```

## Donut behavior

- Overview shows expense vs income shares.
- Tapping the center/legend drills into expense or income.
- A single 100% segment renders as a full stroked circle.
- A drilled view with no items renders an empty `colors.border` ring, not a blank area.
- Zero-percentage arcs are filtered out.
- More than five categories collapse into “Other.”

## Boundaries

- Insights consumes read-only transaction/category data.
- It does not write transactions or categories.
- Recurring transactions appear automatically because they become normal transaction rows.

## Related documentation

- [[2026-09-12-insights-screen-design]]
- [[2026-09-18-insights-combined-donut-design]]
- [[2026-09-18-insights-long-lists-design]]
- [[2026-09-12-insights-screen]]
- [[2026-09-18-insights-combined-donut]]
- [[architecture-index|Back to architecture index]]
