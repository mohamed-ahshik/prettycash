# PrettyCash — Insights Screen Design (Spec)

**Date:** 2026-09-12  
**Status:** Approved for implementation  
**Implementation status:** Not started  

---

## 1. Overview & Objective
Transform the placeholder **Insights** tab into a financial analytics screen based on the visual design reference in `design/WhatsApp Image 2026-09-09 at 23.18.54 (1).jpeg`. The screen includes:
1. A header with a back button and a Month & Year picker modal.
2. A Summary Card featuring an interactive SVG Donut Chart with a center toggle (`⇄`) to switch between **Expenses** and **Income**, plus a category share legend.
3. A Breakdown Card ("Expenses list" / "Income list") where each category row displays its icon, name, percentage, total amount, and a proportional colored progress bar.

---

## 2. Visual Reference Analysis
- **Reference Image:** `design/WhatsApp Image 2026-09-09 at 23.18.54 (1).jpeg`
- **Key Visual Elements:**
  - Header: Back arrow `←`, Month selector `Sept ▾`.
  - Chart Card: Donut ring on left, percentage legend on right. Donut hole contains label ("Expenses"), total amount ("44.64"), and toggle icon (`⇄`).
  - Breakdown Card: Section title ("Expenses list"), rows with circular icons, category name + percentage, right-aligned amount, and an accent colored horizontal progress bar under each row.

---

## 3. UI & Component Architecture

### 3.1 Top Header & Month/Year Selector
- **Header Bar:**
  - Left: Back button (`Icon name="arrow-left"`), navigates to `Home` tab.
  - Center: Pressable button showing selected month/year (e.g., `Sept 2026 ▾`).
- **MonthYearPickerModal:**
  - Triggered by tapping the header month title.
  - Semi-transparent backdrop with a centered modal card.
  - Year selector controls: `<` button, `2026` (bold 18pt), `>` button.
  - Month grid: 12 pill buttons (`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`).
  - Active month pill styled with primary green background (`#00674F`), white text. Inactive pills with `#F0F5F3` background.
  - Selecting a month immediately filters the insights data and dismisses the modal.

### 3.2 Summary Card with SVG Donut Chart
- **Container:** Rounded card (`radii.lg`, background `#FFFFFF`, border `#E6EDEB`, padding 20).
- **DonutChart Component (`react-native-svg`):**
  - Dimensions: ~140x140px, stroke width: 16px.
  - Segments drawn as circular arcs using SVG `Circle` with `strokeDasharray` and `strokeDashoffset` (or SVG `Path`).
  - Center Hole (Pressable):
    - Label: "Expenses" or "Income" (12pt, `#6C757D`, font medium).
    - Amount: Formatted total (e.g. `$44.64`, bold 22pt, font bold, `#1E2422`).
    - Toggle Icon: `swap-horizontal` (16pt, `#6C757D`).
    - **Interaction:** Tapping toggles between `expense` and `income` view modes.
- **Chart Legend (Right side):**
  - Displays up to 5 top categories.
  - Each row: colored ring/dot (10x10), category name (13pt, `#1E2422`), right-aligned percentage (13pt bold, `#1E2422`).

### 3.3 Breakdown Card ("Expenses list" / "Income list")
- **Container:** Rounded card (`radii.lg`, background `#FFFFFF`, border `#E6EDEB`, padding 20, margin top 16).
- **Header Title:** "Expenses list" (or "Income list") in 13pt bold muted text (`#6C757D`, letter-spacing 0.5).
- **BreakdownRow Component:**
  - Left: 38x38 circular icon badge with category background color (`colorBg`) and icon color (`colorFg`).
  - Content column:
    - Top row: Category name (semibold 15pt, `#1E2422`), percentage (regular 12pt, `#6C757D`), right-aligned amount (semibold 15pt, `#1E2422`).
    - Bottom row: Horizontal progress bar with background track (`#F0F5F3`, height 3.5px, rounded) and filled indicator (width: `${percentage}%`, color: category color).
  - Clean padding and separation between rows.

---

## 4. Data Layer & Calculations

### 4.1 Data Models
```ts
export interface CategoryBreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
  bgColor: string;
}

export interface InsightsData {
  total: number;
  type: 'expense' | 'income';
  items: CategoryBreakdownItem[];
}
```

### 4.2 Categories Source & Shared Context
The categories displayed in the Insights breakdown are **sourced directly from the Categories tab** via a shared `CategoriesContext` (`src/context/CategoriesContext.tsx`).
- Whenever a user adds or modifies categories in the Categories tab, the Insights screen immediately reflects those same categories.
- For each category defined in the Categories tab, Insights aggregates the matching transactions (or allocates sample amounts for visualization) using that category's specific name, icon, color, and background tint.

### 4.3 Calculation Logic
1. Retrieve active categories from `CategoriesContext` filtered by the active view type (`expense` vs `income`).
2. Aggregate amounts for each active category for the selected month/year.
3. Compute total amount and percentage share for each category (`(categoryTotal / grandTotal) * 100`).
4. Fallback: If no transactions exist for the selected month, proportional demo allocations are generated across the categories defined in the Categories tab so the chart always displays a realistic breakdown.

---

## 5. Theme Tokens & Styling Consistency
- Primary: `#00674F`
- Background: `#FAFAFA`
- Card: `#FFFFFF`
- Muted background: `#F0F5F3`
- Text: `#1E2422` (primary foreground) / `#6C757D` (muted foreground)
- Typography: DM Sans (`fonts.bold`, `fonts.semibold`, `fonts.medium`, `fonts.regular`)
- Category Colors:
  - Food: `#FFB800` (Amber/Yellow matching reference image)
  - Shopping: `#00B4D8` (Cyan/Blue)
  - Drinks: `#2EC4B6` (Teal/Green)
  - Travel: `#3B5BDB`
  - Entertainment: `#E67E22`
  - Salary: `#2E7D32`
  - Freelance: `#0284C7`

---

## 6. Self-Verification & Testing
- Type-checking: `npx tsc --noEmit` clean exit.
- Functional verification:
  1. Back button navigates to Home screen.
  2. Month/Year picker changes active month and recalculates stats.
  3. Tapping donut chart center toggles between Expense and Income modes.
  4. Donut arcs sum to 100% and match legend items.
  5. Progress bars render proportionally across web and mobile previews.
