# PrettyCash — Categories Screen Design (Spec)

**Date:** 2026-09-12  
**Status:** Approved for implementation  
**Implementation status:** Not started  

---

## 1. Overview & Objective
Replace the placeholder "Wallets" tab with a fully designed **Categories** screen matching the PrettyCash visual design system. The screen features a segmented control switching between **Expense** and **Income** categories, an interactive category list, and an **Add Category** modal collecting category name, notes, icon, and color theme.

---

## 2. Navigation & Tab Bar Changes

1. **Tab Identity:**
   - Rename tab 4 from `Wallets` to `Categories`.
   - Update tab icons in `src/components/TabBar.tsx` to `shape` (active) and `shape-outline` (inactive) from `@expo/vector-icons/MaterialCommunityIcons`.
   - Update tab routes in `App.tsx` replacing `WalletsScreen` with `CategoriesScreen`.

2. **File Changes:**
   - Remove or replace `src/screens/WalletsScreen.tsx` with `src/screens/CategoriesScreen.tsx`.

---

## 3. Categories Screen UI Specification

### 3.1 Header & Segmented Control
- **Header:**
  - Screen title: "Categories" (24pt bold, DM Sans, foreground `#1E2422`).
  - Action button: "+ Add" button (primary `#00674F` background pill or outlined pill) positioned at the top-right.
- **Segmented Toggle:**
  - Centered pill container (`#F0F5F3` background, 8px padding/radii pill).
  - Two options: **Expense** and **Income**.
  - Active segment: `#00674F` background, white bold text (`#FFFFFF`), rounded-full.
  - Inactive segment: transparent background, `#6C757D` medium text.
  - Smooth tap transition switching active category dataset.

### 3.2 Category List
- Contained in a card (`#FFFFFF`, border `#E6EDEB`, border-radius 20px).
- Each category row contains:
  - Circular icon badge (40x40, rounded-full, category background color).
  - Icon centered (20pt, category foreground color).
  - Info stack:
    - Category name (15pt, semibold, `#1E2422`).
    - Optional notes snippet (12pt, regular, `#6C757D`, truncated to 1 line if long).
  - Divider between rows (`#E6EDEB`).

### 3.3 Default Initial Categories
- **Expense Categories:**
  - Food (`cart-outline`, `#DFF0EB` / `#00674F`, notes: "Groceries & dining")
  - Travel (`car-outline`, `#E8EFFD` / `#3B5BDB`, notes: "Commute & transit")
  - Fun (`play`, `#FFEEE3` / `#E67E22`, notes: "Movies & subscriptions")
  - Coffee (`coffee-outline`, `#FFF4D6` / `#9C7A00`, notes: "Cafes & quick bites")
  - Bills (`file-document-outline`, `#F3E8FF` / `#7C3AED`, notes: "Utilities & rent")
  - Shopping (`bag-handle-outline`, `#FCE7F3` / `#DB2777`, notes: "Personal items & gear")
- **Income Categories:**
  - Salary (`briefcase-outline`, `#E8F5E9` / `#2E7D32`, notes: "Monthly payroll")
  - Freelance (`laptop`, `#E0F2FE` / `#0284C7`, notes: "Client contracts & gigs")
  - Investments (`chart-line`, `#FEF3C7` / `#D97706`, notes: "Dividends & capital gains")
  - Gifts (`gift-outline`, `#FFE4E6` / `#E11D48`, notes: "Occasions & bonuses")

---

## 4. "Add Category" Modal Specification

### 4.1 Modal Layout
- Bottom sheet or slide-up modal with semi-transparent overlay (`rgba(0,0,0,0.5)`).
- Top bar with "Add Category" title, active type indicator ("for Expense" or "for Income"), and a close icon button (`close`).

### 4.2 Form Fields
1. **Name:**
   - Text input with border `#E6EDEB`, rounded-12, background `#FAFAFA`.
   - Placeholder: "Category name (e.g. Groceries)".
2. **Notes:**
   - Multiline text input (min-height 60), rounded-12, background `#FAFAFA`.
   - Placeholder: "Notes (optional, e.g. monthly budget notes)".
3. **Icon Selector:**
   - Horizontal scrolling or grid of 8 selectable icons: `cart-outline`, `car-outline`, `coffee-outline`, `play`, `briefcase-outline`, `laptop`, `chart-line`, `gift-outline`, `home-outline`, `medical-bag`.
   - Selected icon has ring `#00674F` and primary tint.
4. **Color Palette Selector:**
   - Row of 5 selectable color chips (`#DFF0EB`, `#E8EFFD`, `#FFEEE3`, `#FFF4D6`, `#E8F5E9`, `#F3E8FF`).
   - Selected chip highlighted with checkmark or border.
5. **Save Button:**
   - Full-width button, background `#00674F`, text `#FFFFFF`, bold 16pt, height 48, rounded-full.
   - Disabled / dimmed if Name is empty.

### 4.3 State & Behavior
- State stored in local React state (`useState`) within the component or shared context for this pass.
- On save: validates non-empty name, constructs category item, appends to the selected type list, and dismisses modal.

---

## 5. Error Handling & Edge Cases
- Empty category name prevented via disabled save button.
- Clean scrolling inside the modal to support smaller phone viewports and virtual keyboards.
- Safe area insets respected at the top and bottom.

---

## 6. Verification Plan
- Type checking: `npx tsc --noEmit` must pass with zero errors.
- Visual inspection on both web preview and mobile layout.
- Manual test cases:
  1. Toggle between Expense and Income tabs updates the list.
  2. Clicking "+ Add" opens the modal.
  3. Filling out name and notes and selecting icon/color adds the category to the selected tab immediately.
  4. Tab bar highlights "Categories" when selected.
