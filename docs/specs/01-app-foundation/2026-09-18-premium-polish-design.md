# PrettyCash — Premium Polish (Phased) Design

**Date:** 2026-09-18
**Status:** Approved for implementation
**Implementation status:** Phase 1 complete; Phase 2 complete (motion tokens, BottomSheet + all modals, ticker, list/donut/tab/segment/breakdown transitions, scanning state, splash). All uncommitted, pending on-device review.

---

## 1. Overview & Objective

Two senior reviews (visual + motion) found the app has strong bones but lacks a *system*: money renders inconsistently, there's no type/spacing/elevation discipline, several contrast values fail AA, and there is effectively **no motion layer**. This spec defines a two-phase pass to make it feel high-end and premium without changing its personality (forest-green brand, DM Sans, notched tab bar, icon-in-tinted-circle motif).

- **Phase 1 — Foundations & quick wins** (no new dependencies).
- **Phase 2 — Motion system** (adds Reanimated + Gesture Handler).

Everything is token-driven so the app stays consistent as it grows.

---

## 2. Phase 1 — Foundations & Quick Wins (no new deps)

### 2.1 Money rendering (highest impact)
- Rewrite `src/utils/format.ts` so money is consistent: **thousands grouping always**, **always 2 decimals**, currency symbol from the selected profile currency, and **no leading `+` on zero**.
- Expose a currency-symbol setter (module-level, like `lib/haptics.ts`): `setCurrencySymbol(symbol)`; `formatMoney` uses it. Wire it at app start (`App.tsx` Bootstrap), on Profile load, and on currency change (`ProfileScreen`).
- Symbol map for the supported list: `USD ($)→$`, `EUR (€)→€`, `GBP (£)→£`, `JPY (¥)→¥`, `CAD ($)→$`, `SGD ($)→$`.
- Add a shared `money` text style with `fontVariant: ['tabular-nums']` and apply it to every amount (BalanceCard, TransactionRow, TransactionGroup, BreakdownRow, DonutChart center, RecurringModal rows).
- Fix `'Sept'` → `'Sep'` in `MONTH_NAMES`.
- Insights dollar formatting is out of scope (it shows unitless amounts) except tabular numerals.

### 2.2 Colour & contrast
- `mutedForeground #6C757D → #5C6670` (AA on `#FAFAFA` and on `#F0F5F3`).
- `expenseText #D9534F → #C0392B`; `incomeText #2E7D32 → #1B5E20`.
- Add semantic tokens: `overlay` (`rgba(16,24,22,0.45)`), `secondaryStrong` (`#C9E7DE`), `dangerSurface` (`#FDECEA`), `primaryPressed` (`#005440`).
- Replace hardcoded hexes in `BalanceCard` with tokens; token-ise switch thumb colours.
- Category palette curation (seed/data colours) is **deferred** — existing DB rows already store colours.

### 2.3 Tokens: type, spacing, radii, elevation
- New `src/theme/text.ts` with named presets: `display(40/44,700,-1.0)`, `title(28/34,700,-0.6)`, `heading(20/26,700,-0.3)`, `subhead(16/22,600,-0.1)`, `bodyLg(15/21,600)`, `body(14/20,400)`, `label(13/18,600)`, `caption(12/16,500)`, `overline(11/14,700,+0.8,uppercase)`, plus `moneyHero`/`moneyBody`/`moneyCaption` (tabular numerals).
- Remove redundant `fontWeight` where `fontFamily` already sets the weight.
- Enforce the existing `spacing` scale (`2,4,8,12,16,20,24,32,40`) — screen gutter 20, card padding 20, row padding-vertical 14, section top-gap 28.
- Radii tokens: add `xs 8`, `sm 12` (inputs), `md 16` (inner tiles), `lg 20` (cards), `xl 28` (sheet tops), `pill`. Replace hardcoded 16/18/20/24.
- Elevation tokens: `e1` card shadow, `e2` floating (tab bar/FAB), `e3` sheets/dialogs. Apply `e1` to content cards and `e2` to the tab bar/FAB.

### 2.4 Headers, sections, navigation
- One screen-title spec (`title` preset) on Home, Insights, Categories, Profile.
- Insights gets an **"Insights" title**; remove the back-to-Home arrow (it's a tab).
- One section-header spec (`overline`) across Home, BreakdownCard, Profile.
- One month-pill used by both Home and Insights (Home's bordered pill), replacing Insights' borderless variant.
- Remove Home's non-functional "See all" (until a full-list screen exists).

### 2.5 Balance hero (`BalanceCard`)
- Remove the pale backdrop "fringe" (or redo as an intentional, inset stack — decision: **remove** for now).
- Balance → `display` + tabular numerals. Label → `overline`; keep "Total balance" but it is month-scoped (unchanged behaviour).
- Split capsule: colour Income/Expense values semantically (`incomeText`/`expenseText`), icon chips 40, values `bodyLg`.

### 2.6 Insights hierarchy (`DonutChart` / `InsightsScreen`)
- Ring 160 (stroke 18). Center shows the **expense total at root** (with an "Expenses" overline), and the drilled type's total when drilled; drop the cryptic 16px icon. Center cycling stays (existing behaviour) but is secondary.
- Cap slices at **5 + Other** (`MAX_DONUT_SLICES = 5`).
- Legend below > 4 items in a 2-column grid; legend rows stay tappable.

### 2.7 Row rhythm & icon/badge sizes
- Divider only **between** rows (not before the first).
- Row `minHeight 64`, padding-vertical 14; group header `overline`, paddingTop 20 / bottom 6.
- Icon sizes: `sm 16`, `md 20`, `lg 24`; badges 40 (rows) / 44 (empty states). Align chevrons to 18. Give the Insights tab an active/inactive icon pair; tab labels keep one weight (colour-only active state).

### 2.8 States
- New `EmptyState` (tinted circle + icon, `bodyLg` title, `caption` muted subtitle, optional pill CTA) used on Home ("No transactions yet") and Insights.
- New `AlertBanner` (danger surface, icon, left-aligned `label`) for errors; move the Add/Edit sheet error **below the header**.
- Global press feedback (opacity 0.85 / scale 0.98 on `pressed`) on rows, chips, tabs, menu rows, buttons — no deps.

---

## 3. Phase 2 — Motion System (adds deps)

**Dependencies (SDK 57 bundled):** `npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler`; wrap the app in `GestureHandlerRootView`.

### 3.1 Motion tokens — `src/theme/motion.ts`
- Micro/press 90–120ms; selection/toggle 180–220ms (spring `{damping:30,stiffness:350,mass:0.7}`); sheet present spring `{damping:24,stiffness:220,mass:0.8}` / dismiss 220–240ms ease-in; screen/tab 200–260ms cross-fade + 8–12px; value/content 300–500ms ease-out; data-viz sweep 600–800ms ease-out; list enter 180ms / exit 140ms; stagger 25–40ms (max 6, first paint only).
- Rule: **never spring monetary values**; animate only `transform`/`opacity`; respect `useReducedMotion()` (replace movement with ≤150ms fades).

### 3.2 Components
- `BottomSheet` (spring present, drag-to-dismiss, backdrop fades with drag, grabber); migrate `AddTransactionSheet`, `EditTransactionSheet`, `RecurringModal`, `AddRecurringModal`, `AddCategoryModal`.
- `AnimatedNumber` ticker for the balance (500ms) and Income/Expense (350ms); tabular numerals; snap under reduced motion.
- Donut arc sweep (650ms, 40ms stagger) via animated `strokeDashoffset`; center cross-fade. (Visual regression risk: revisit the sector-path hit-testing from the last fix — the sweep must not reintroduce the arc-tap bug; keep the current `Path`-sector hit-testing and animate only the drawing, not the hit regions.)
- List enter/exit + `LinearTransition` reflow for transactions and breakdown rows; animated collapse + progress-bar `scaleX` fills; segmented-control sliding thumb; tab press springs, active indicator, `Tab.Navigator animation: 'fade'`.
- Add Transaction step transitions (chooser → capture → analyzing → form) with a scanning skeleton.
- Splash/brand entrance via `expo-splash-screen` (optional).

---

## 4. Testing

- Unit tests for the new `formatMoney`/currency-symbol logic (grouping, 2 decimals, no `+0`, symbol swap) — extends `format.test.ts`.
- `npx tsc --noEmit` and `npm test` must pass after every task.
- Visual checks are manual against the existing screenshots; Phase 2 needs on-device checks (mid-tier Android for jank) and a reduced-motion pass.

---

## 5. Out of Scope (backlog)

- Dark mode (needs semantic tokens + `ThemeProvider`).
- Category palette curation for existing DB rows.
- Native date/time pickers, amount-first form redesign, full-list screens.
- Extracting every shared primitive beyond `BottomSheet` (sheet headers, section headers).
- Skeleton loaders for Categories/Profile beyond the existing spinners.
