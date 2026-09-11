# PrettyCash — Profile & Recurring Transactions Design (Spec)

**Date:** 2026-09-12  
**Status:** Approved for implementation  
**Implementation status:** Not started  

---

## 1. Overview & Objective
1. **Relocate Profile Header:** Move the user avatar ("M") and "Hi Maya!" greeting from the Home screen into the dedicated **Profile** screen. Replace the Home screen top bar with an elegant "PrettyCash" app title and date.
2. **Profile Screen Content:** Build out the Profile screen to feature:
   - User Hero Card (Avatar, Name, Email/Member date, Edit Profile action).
   - **Recurring Transactions** management (schedule recurring expenses and incomes with specific day of month).
   - **Settings** (Currency, Notifications, Haptic Feedback, Export Data).
   - **About** section (App name, Version `1.0.0`, Version code `1`, and app description — with no license/credits lines).

---

## 2. Home Screen Header Update

- **Modification in `HomeScreen.tsx`:**
  - Remove circular avatar badge and "Hi Maya!" greeting.
  - New Header:
    - Title: "PrettyCash" (22pt bold, DM Sans, foreground `#1E2422`).
    - Date: "Tue, Sep 9" (12pt medium, muted `#6C757D`).
  - The rest of the Home layout (`MonthPicker`, `BalanceCard`, `TransactionGroup`) remains unchanged.

---

## 3. Profile Screen UI & Layout

### 3.1 User Hero Card
- Container: Card (`#FFFFFF`, border `#E6EDEB`, border-radius 20px, padding 20).
- Avatar: 64x64 circular badge (primary green `#00674F` background, white bold 24pt text `"M"`).
- Details:
  - Name: "Maya" (bold 20pt `#1E2422`).
  - Subtitle: "maya@prettycash.app • Member since Sep 2026" (12pt muted `#6C757D`).
- Action: "Edit Profile" pill button (`#F0F5F3` background, 12pt semibold `#00674F`).

### 3.2 Recurring Transactions Section
- **Card Entry on Profile Screen:**
  - Icon: `calendar-sync` or `repeat` in 40x40 circular badge (`#DFF0EB` background, `#00674F` icon).
  - Title: "Recurring Transactions" (15pt semibold `#1E2422`).
  - Subtitle: "Rent, Netflix, Salary • 4 scheduled" (12pt muted `#6C757D`).
  - Chevron right icon (`chevron-right`).
- **Recurring Transactions Modal / Sheet:**
  - Header: "Recurring Transactions" with close button (`✕`) and "+ Add" button.
  - Segmented toggle: **Expense** and **Income**.
  - Recurring Item Card/Row:
    - Category circular icon (e.g. `play` for Netflix, `briefcase-outline` for Salary).
    - Title and Schedule rule: e.g. **Netflix** • *Day 8 of each month*.
    - Amount: `-$15.99` (expense) or `+$5,200.00` (income).
    - Status toggle switch: Active / Paused.
- **"Add Recurring" Modal:**
  - Fields:
    1. Title / Name (e.g. "Rent", "Netflix").
    2. Type: Segmented toggle between **Expense** and **Income**.
    3. Amount: Formatted numeric input (e.g. "1200.00").
    4. Category: Selection from active categories.
    5. Day of the Month: 1–31 selection.
  - Save button: Validates required fields and appends to recurring items list.

### 3.3 Settings Section
Grouped card on the Profile screen:
1. **Currency:** Shows current selection (e.g. `USD ($)`), opens modal picker for USD, EUR, GBP, JPY, CAD.
2. **Payment Reminders:** Toggle switch for recurring payment notifications.
3. **Haptic Feedback:** Toggle switch for tactile button taps.
4. **Export Data:** Row to export transaction data as CSV/JSON (placeholder confirmation for this pass).

### 3.4 About Section
Contained in a card or modal:
- **App Name:** PrettyCash
- **Version:** `1.0.0`
- **Version Code:** `1` (Build 202609)
- **Description:** "PrettyCash is a modern, lightweight personal budget and expense tracking application designed for speed, clarity, and peace of mind."
*(Note: License, credits, and framework details are explicitly excluded per user request).*

---

## 4. Data Layer & Models

```ts
export interface RecurringItem {
  id: string;
  name: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  icon: string;
  colorBg: string;
  colorFg: string;
  dayOfMonth: number; // 1-31
  active: boolean;
}

export interface UserProfile {
  name: string;
  initial: string;
  email: string;
  memberSince: string;
  currency: string;
  notificationsEnabled: boolean;
  hapticsEnabled: boolean;
}
```

### Initial Default Recurring Items
- Expense:
  - **Rent**: $1,200.00, Bills (`file-document-outline`), Day 1 of month, active: true
  - **Netflix**: $15.99, Fun (`play`), Day 8 of month, active: true
  - **Internet**: $65.00, Bills (`file-document-outline`), Day 15 of month, active: true
- Income:
  - **Salary**: $5,200.00, Income (`briefcase-outline`), Day 1 of month, active: true

---

## 5. Theme & Styling
- Primary: `#00674F`
- Background: `#FAFAFA`
- Card: `#FFFFFF`
- Muted: `#F0F5F3` / `#6C757D`
- Border: `#E6EDEB`
- Typography: DM Sans (`fonts.bold`, `fonts.semibold`, `fonts.medium`, `fonts.regular`)

---

## 6. Self-Verification & Testing
- `npx tsc --noEmit` must pass with zero errors.
- Visual inspection on Home: Avatar and "Hi Maya!" are gone; "PrettyCash" branding displays cleanly.
- Visual inspection on Profile: Hero card, Recurring card, Settings rows, and About info render with consistent styling.
- Recurring modal: Toggling between Expense and Income filters items; adding a recurring item updates the list.
- Settings switches toggle on/off cleanly in React state.
