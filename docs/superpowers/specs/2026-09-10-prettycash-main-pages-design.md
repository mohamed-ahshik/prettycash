# PrettyCash — Main Pages Design (Spec)

Date: 2026-09-10
Status: Approved for implementation
Implementation status: In progress

## Overview

PrettyCash is a budget-tracking app for Android built with React Native + Expo.
This spec covers the first pass: build the main pages (screens) with static mock
data, before any real functionality (state, persistence, charts, data entry).

The visual design reference is `design/main_page.html`, which must be matched
pixel-for-pixel on the Home screen.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Screens this pass | Home (pixel-perfect) + Insights (placeholder content) + Wallets/Profile (minimal placeholders) |
| Data | Hardcoded mock data in `src/data/mockData.ts` |
| Navigation | React Navigation (bottom tabs) with a custom floating pill tab bar |
| Icons | `@expo/vector-icons` — MaterialCommunityIcons (approx Solar mapping) |
| Language | TypeScript |
| Styling | `StyleSheet` + central theme tokens |

## Project structure

```
prettycash/
├── App.tsx                     # NavigationContainer + bottom tab navigator
├── src/
│   ├── theme/
│   │   ├── colors.ts           # palette from the design
│   │   ├── typography.ts       # font family/sizes/weights
│   │   ├── spacing.ts          # spacing + radii
│   │   └── index.ts            # re-exports
│   ├── types/
│   │   └── index.ts            # Transaction, Category, TransactionGroup
│   ├── data/
│   │   └── mockData.ts         # Maya + balance + sample transactions
│   ├── components/
│   │   ├── Icon.tsx            # MaterialCommunityIcons wrapper w/ solar→mc name map
│   │   ├── BalanceCard.tsx     # overlapping-stack balance card
│   │   ├── TransactionRow.tsx
│   │   ├── TransactionGroup.tsx
│   │   ├── MonthPicker.tsx     # centered pill dropdown
│   │   └── TabBar.tsx          # custom floating pill tab bar
│   └── screens/
│       ├── HomeScreen.tsx
│       ├── InsightsScreen.tsx
│       ├── WalletsScreen.tsx   # placeholder
│       └── ProfileScreen.tsx   # placeholder
```

## Theme tokens

Extracted from the inline CSS variables in `main_page.html`.

| Token | Value | | Token | Value |
|---|---|---|---|---|
| background | `#FAFAFA` | | muted | `#F0F5F3` |
| foreground | `#1E2422` | | muted-foreground | `#6C757D` |
| card | `#FFFFFF` | | accent | `#FFEEE3` |
| primary | `#00674F` | | accent-foreground | `#7A4A2E` |
| secondary | `#DFF0EB` | | border | `#E6EDEB` |
| secondary-foreground | `#004D3B` | | ring | `#00674F` |

Category accent pairs (icon circle bg / icon color):

| Category | bg | icon color |
|---|---|---|
| Food | `#DFF0EB` | `#00674F` |
| Travel | `#E8EFFD` | `#3B5BDB` |
| Fun | `#FFEEE3` | `#E67E22` |
| Coffee (Food) | `#FFF4D6` | `#9C7A00` |
| Income | `#E8F5E9` | `#2E7D32` |

Font: DM Sans (via `@expo-google-fonts/dm-sans`), weights 400/500/600/700.

## Screens

### HomeScreen (matches `main_page.html` exactly)

- Header: circular avatar "M" (primary bg, white bold 18), "Hi Maya!" (18 semibold),
  date "Tue, Sep 9" (12 muted-foreground).
- Centered `MonthPicker` pill: calendar icon + "September 2026" + chevron, card bg,
  border, rounded-full, min-height 44.
- `BalanceCard`: three stacked rounded cards (two absolute tinted backdrops at
  `#DFF0EB` then `#C9E7DE`, plus a foreground card with a radial dot-grid pattern),
  containing total `$4,280.50` (32 bold) + eye icon, then an income/expense split row
  (Income `+$5,200` green, Expense `$2,140` red) on a `#F0F5F3` inset.
- "Daily transactions" header + "See all" link, then `TransactionGroup`s for
  Today / Yesterday / Sep 1. Each `TransactionRow`: icon circle, name, time • category,
  right-aligned signed amount (green for income, foreground for expense).
- Scrollable content, safe-area aware.

### InsightsScreen (placeholder)

Header + "Spending by category" placeholder card + "Monthly trend" placeholder card,
styled like Home. Real charts come later.

### WalletsScreen / ProfileScreen (placeholders)

Minimal: a header + empty-state text.

## Navigation

React Navigation bottom tabs with a custom `TabBar` component:

- Floating rounded-full pill, card bg, border, positioned above bottom safe area.
- 5 items: Home, Insights, **Add** (raised circle `#004D3B`, white `+`, raised offset),
  Wallets, Profile.
- Active tab: primary color + bold label; inactive: muted-foreground + medium label.
- Home, Insights, Wallets, Profile are tab screens; Add is present but inert this pass.

## Data

`src/data/mockData.ts` exports typed models with the exact values from the HTML:

- Transactions: Whole Foods Market (`-$86.40`, Food), Uber (`-$24.80`, Travel),
  Netflix (`-$15.99`, Fun), Coffee Run (`-$6.20`, Food), Salary September (`+$5,200`, Income).
- Grouped by day with day headers and daily totals.

## Error handling & testing

- Empty-list fallback in `TransactionGroup` renderer.
- Verification step for this pass: `npx tsc --noEmit` type-check. No unit tests yet.
