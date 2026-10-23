# PrettyCash — Dark Mode Design

**Date:** 2026-09-20
**Status:** Approved for implementation
**Implementation status:** Implemented — passed two senior reviews (visual + architecture) and a final whole-branch review; all P0/P1 fixed and re-reviewed (fix commits `3c08875`, `682ad48`). The `theme_preference` migration was applied to the live Supabase project on 2026-10-21, and the Appearance segmented control sizing was fixed on 2026-10-22 (`flexBasis: 176`, no label truncation). Outstanding human step: run the on-device checklist. Deferred P2s: Appearance swatches preview stored pastels, dark Switch on-track low contrast, avatar boundary for dark presets, no derived-tint contrast test, no SegmentedControl regression test, dark-tinted shadows (spec out of scope), optimistic rapid-tap persist race.

---

## 1. Overview & Objective

PrettyCash is light-only: `src/theme/colors.ts` is a static object imported by 29 modules and baked into 28 module-level `StyleSheet.create` blocks; `app.json` pins `userInterfaceStyle: "light"`; the StatusBar is hardcoded dark.

Add a first-class dark mode that (a) follows the OS by default, (b) allows a per-account **System / Light / Dark** override stored on the Supabase profile, (c) keeps the forest-green brand identity on dark surfaces, and (d) leaves stored data (category `colorBg`/`colorFg`) untouched by deriving dark variants at render time.

Success criteria: every screen, modal, sheet, and shell surface renders correctly in both schemes; live switching works without reload; contrast meets WCAG AA; no UI module reads a frozen light palette at module scope.

---

## 2. Activation & Behavior

- Preference type: `'light' | 'dark' | 'system'`; default `'system'`.
- Effective scheme: `preference === 'system' ? (useColorScheme() ?? 'light') : preference`.
- Changing the OS appearance while preference is `'system'` switches the app live. Selecting Light/Dark pins the app regardless of OS.
- Profile → Appearance shows System / Light / Dark; selection applies instantly (optimistic) and persists to the profile row.
- Pre-auth surfaces (Splash, Login) use the OS scheme; after Bootstrap loads the profile, the saved preference applies before the main UI paints.

---

## 3. Design Tokens

### 3.1 Palettes — `src/theme/palettes.ts`

`lightColors = { ...colors, canvas: '#EEF2F0' }`, sourced from the existing `src/theme/colors.ts` values (single source of truth for light); `darkColors` is the new green-tinted set. Both share the same semantic keys, plus the new `canvas` token (web phone-frame background).

| Token | Light (current) | Dark |
|---|---|---|
| background | #FAFAFA | #0D1412 |
| card | #FFFFFF | #151D1A |
| muted | #F0F5F3 | #1B2521 |
| foreground | #1E2422 | #ECF2EF |
| mutedForeground | #5C6670 | #A3B0AB |
| border | #E6EDEB | #263330 |
| primary | #00674F | #34D399 |
| primaryPressed | #005440 | #2BAF85 |
| primaryForeground | #FFFFFF | #06231B |
| secondary | #DFF0EB | #1C2C26 |
| secondaryStrong | #C9E7DE | #274039 |
| secondaryForeground | #004D3B | #A8E6CF |
| accent | #FFEEE3 | #2E211A |
| accentForeground | #7A4A2E | #F0C3A4 |
| incomeText | #1B5E20 | #7BDFA0 |
| expenseText | #C0392B | #F87171 |
| overlay | rgba(16,24,22,0.45) | rgba(0,0,0,0.6) |
| dangerSurface | #FDECEA | #2E1A18 |
| ring | #00674F | #34D399 |
| canvas *(new)* | #EEF2F0 | #0A0E0D |

Rules:
- `ThemeColors` type = widened values of the light token keys; `darkColors: ThemeColors` — a missing/extra key is a compile error.
- In dark mode `primary` is a light fill with **dark** `primaryForeground`; contrast is maintained wherever `primary` is used as text/icon.
- Shadows (`src/theme/spacing.ts`) keep their baked rgba colors in both schemes; dark surfaces rely on color elevation (background → card → muted), not shadows. No shadow work in this spec.
- Values above are the starting point; the contrast test (§8) is the gate and may force small tuning.

### 3.2 Category tint derivation — `src/utils/categoryColors.ts`

Stored category pairs are pastel-light (DB columns `color_bg`/`color_fg`). New pure helper:

```ts
export function deriveCategoryColors(colorBg: string, colorFg: string, isDark: boolean):
  { colorBg: string; colorFg: string };
```

- `isDark === false` returns inputs unchanged.
- `isDark === true` converts hex → HSL (no dependency), clamps stored bg lightness to ~22–26% and raises stored fg lightness to ~75–82%, preserving hue/saturation; falls back to the neutral pair (`#1B2521`/`#A3B0AB`) on invalid hex.
- DB values are never mutated or re-saved; derivation happens at render time.

### 3.3 Category avatar — `src/components/CategoryAvatar.tsx`

New shared component consolidating the duplicated icon-in-tinted-circle markup:

```tsx
<CategoryAvatar icon={string} colorBg={string} colorFg={string} size?={number} iconSize?={number} />
```

- Owns the circle and applies `deriveCategoryColors` using `useTheme()`. Defaults: badge `size` 40, glyph `iconSize` 20. Call sites keep their current values (42/20 rows, 40/20 transactions, 38/20 breakdown, 16 chips, 22 picker) so Phase 3 introduces zero visual change.
- Replaces the inline motif in `CategoryRow`, `TransactionRow`, `BreakdownRow`, `RecurringModal`, `TransactionForm`, `AddTransactionSheet`, `AddRecurringModal`.
- Insights charts derive before passing colors down: `InsightsScreen` maps slices/breakdown rows via `deriveCategoryColors` (or a small local hook) so `DonutChart` and `BreakdownRow` receive final colors.

---

## 4. Architecture

### 4.1 Theme context — `src/context/ThemeContext.tsx`

Follows the `CurrencyContext` pattern (createContext + throw-guard hook):

```ts
interface ThemeContextValue {
  preference: ThemePreference;      // 'light' | 'dark' | 'system'
  scheme: 'light' | 'dark';         // resolved
  colors: ThemeColors;
  isDark: boolean;
  setPreference: (p: ThemePreference) => void;
}
export function ThemeProvider({ children }): JSX.Element;
export function useTheme(): ThemeContextValue;
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T;
```

- `ThemeProvider` lives in `App.tsx` above the auth gate (wraps `Gate`) so Splash/Login are themed.
- `useThemedStyles` wraps `StyleSheet.create(factory(colors))` in `useMemo` keyed on `colors`.
- On scheme change, a native-only effect calls `SystemUI.setBackgroundColorAsync(colors.background)` (`expo-system-ui`) to avoid root-view flash (`src/context/ThemeContext.tsx`; no-op on web).

### 4.2 Style migration pattern (28 files)

Before:

```tsx
const styles = StyleSheet.create({ row: { backgroundColor: colors.card } });
// render: <View style={styles.row} />  and  color={colors.primary}
```

After:

```tsx
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({ row: { backgroundColor: colors.card } });

function Row() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme(); // for inline color props
}
```

- Identical pattern in every screen/component that imports `colors` today.
- `src/theme/colors.ts` continues to export `colors` (light values) but **no UI module may import it**; it remains only for stored-data concerns and tests (`seed.ts`, `categoriesData.ts`, `mappers.ts` fallbacks, unit tests). Migration is complete when the audit grep (§8) returns no UI hits.
- Pure/non-React consumers:
  - `src/utils/insights.ts` — palette-dependent tokens become a parameter (`mutedForeground`, `muted` for the "Other" slice).
  - `src/utils/aggregate.ts` — unchanged; its neutral light fallbacks (`#6B7280`/`#F3F4F6`) flow through the same render-time derivation as stored category colors.

### 4.3 App shell

- `App.tsx`: subscribe to `useTheme` in `AppNavigator`; pass a custom React Navigation theme (`dark: true` in dark; background/card/text/border/primary mapped from tokens) to `NavigationContainer`.
- `<StatusBar style={isDark ? 'light' : 'dark'} />` replaces `App.tsx:187`.
- `app.json`: `"userInterfaceStyle": "automatic"`; add `expo-system-ui` plugin/dependency (`npx expo install expo-system-ui`). Per SDK 57 docs this config is build-time and needs a new native build to take effect on Android.
- Web phone frame (`App.tsx:268`) uses the `canvas` token.

---

## 5. Persistence

- Migration `supabase/migrations/20260920000000_add_theme_preference.sql`:

```sql
alter table public.profiles
  add column if not exists theme_preference text not null default 'system'
  check (theme_preference in ('light', 'dark', 'system'));
```

- `src/types/profile.ts`: `themePreference: ThemePreference` on `UserProfile` (`ThemePreference` is defined in `src/theme/palettes.ts` and re-exported through `src/theme/index.ts`).
- `mappers.ts`: map `theme_preference` → `themePreference`, defaulting to `'system'` when absent.
- `profileRepo.upsertProfile` includes `theme_preference`.
- `App.tsx` Bootstrap: after `getProfile()`, call `setPreference(existing?.themePreference ?? 'system')` before flipping `ready`, so the app's first paint uses the saved scheme. `upsertProfile` for new profiles writes `themePreference: 'system'`.
- No AsyncStorage mirror: appearance is profile-synced, and the Bootstrap gate prevents a post-splash flash. Splash/Login follow the OS scheme.

---

## 6. Profile UI — Appearance section

- New card/row in `ProfileScreen` (near Notifications/Haptics) titled **Appearance**, with a `SegmentedControl` of three text labels: System / Light / Dark (no icons; matches existing `SegmentedControl` usage).
- Selection: `setPreference(next)` immediately; persist via the existing optimistic `updateProfile({ themePreference: next })` path; failures surface through ProfileScreen's existing error banner. No revert on failure (local choice still applies for the session), matching the screen's current behavior.
- Accessibility: segmented options get `accessibilityRole="button"`/selected state consistent with existing `SegmentedControl` usage.

---

## 7. Migration Plan (3 phases)

### Phase 1 — Foundations (no visual change)
1. `src/theme/palettes.ts` — `lightColors`, `darkColors`, `ThemeColors`, `ThemePreference`; re-export via `src/theme/index.ts`.
2. `src/utils/categoryColors.ts` + `src/utils/contrast.ts`.
3. `src/context/ThemeContext.tsx` — provider, `useTheme`, `useThemedStyles`, SystemUI background effect.
4. `src/components/CategoryAvatar.tsx`.
5. Migration + `types/profile.ts` + `mappers.ts` + `profileRepo.ts`.
6. `npx expo install expo-system-ui`; `app.json` → `automatic`. ThemeProvider mounted; nothing else converted yet.

### Phase 2 — Persistence & setting
7. Bootstrap loads/saves `themePreference`.
8. ProfileScreen Appearance section.
9. `NavigationContainer` nav theme + StatusBar follow scheme.

### Phase 3 — Full sweep
10. Convert `App.tsx` (Splash/Error/AuthError/web frame) to themed styles.
11. Convert 5 screens: Home, Insights, Categories, Login, Profile.
12. Convert 22 themed components: AboutModal, AddCategoryModal, AddRecurringModal, AddTransactionSheet, AlertBanner, BalanceCard, BottomSheet, BreakdownCard, BreakdownRow, CategoryRow, CurrencyPickerModal, DonutChart, EmptyState, MonthPicker, MonthYearPickerModal, ReceiptImagePicker, RecurringModal, SegmentedControl, TabBar, TransactionForm, TransactionGroup, TransactionRow.
13. Route category tints through `CategoryAvatar`/derivation (incl. `AddRecurringModal` hardcoded quick-chip palette → `PRESET_CATEGORY_COLORS` + derivation); parameterize `insights.ts` (aggregate fallbacks derive at render).
14. Cleanups while in-file: 3 hardcoded backdrops `rgba(0,0,0,0.4)` (`MonthYearPickerModal`, `CurrencyPickerModal`, `AboutModal`) → `colors.overlay`; `BalanceCard` mask `#000` stops unchanged (intentional); white Switch thumbs unchanged (platform-consistent).
15. Docs: update `design/brand.md` ("light only" → light + dark).

---

## 8. Testing & Verification

Automated:
- `src/utils/__tests__/categoryColors.test.ts` — light passthrough; known pair → expected dark values; hue preserved; lightness clamped; invalid hex → neutral fallback.
- `src/theme/__tests__/palette.test.ts` — using `contrastRatio` (`src/utils/contrast.ts`): `foreground`, `mutedForeground`, `primary` (as text), `secondaryForeground`, `accentForeground`, `incomeText`, `expenseText` ≥ 4.5:1 against `background`/`card`/their surfaces; icon/large pairs ≥ 3:1; same assertions for the light palette (regression guard).
- `npx tsc --noEmit` and `npm test` after each phase.
- Audit grep: no `import ... colors ... from '../theme'` (or `theme/colors`) remains in `src/screens`, `src/components`, or `App.tsx`.

Manual (device):
- All 4 tabs, every modal/sheet, form + receipt flow, insights donut/breakdown, Splash/Login.
- Live switch System↔Light↔Dark; change OS appearance while open in System mode; relaunch → preference persists (profile sync); offline save failure shows banner.
- Backdrop, border, and category-derived tints legible on dark; no white flashes when navigating/opening sheets.

---

## 9. Post-Implementation Senior Review

After Phase 3 passes tests, dispatch **two independent senior frontend engineer reviews** (parallel subagents), each given the full diff and this spec:

1. **Visual/UX review** — screenshots of every screen/modal in both schemes; checks palette hierarchy and brand coherence, contrast, derived category tints (including user-created colors), overlay/backdrop consistency, StatusBar, Splash/Login, tab bar, charts, and live-switching behavior; flags any light-mode regression.
2. **Architecture/quality review** — checks provider/hook design, no static-palette leakage in UI modules, correct memoization and re-render scope, type-safety of `ThemeColors`/`ThemePreference`, persistence/error paths, migration safety, test coverage, and spec adherence.

Both report findings (P0/P1/P2). All P0/P1 findings are fixed before marking the spec complete; the final summary and the `Implementation status:` line record the review outcome.

---

## 10. Out of Scope

- OLED/true-black palette; animated theme transition.
- Per-category dark color pairs stored in the DB.
- User-custom themes/accent colors; theme-aware app icon/splash assets.
- Local preference cache for offline boot (preference requires profile load; Splash uses OS scheme).
- Web `meta theme-color` / PWA theming.

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| 28-file sweep misses a usage | Audit grep + manual checklist; `ThemeColors` exhaustiveness makes palette key mistakes compile errors |
| Contrast failures in proposed dark hexes | Automated contrast test is the gate; tune hexes until green |
| Category tints look off for unusual user colors | Clamp L/S, preserve hue; neutral fallback; visual review covers user-created colors |
| Perf from per-theme `StyleSheet.create` | `useMemo` per component, recompute only on scheme change |
| Android ignores `automatic` without rebuild | `expo-system-ui` installed + documented new native build requirement |
| Splash flash when saved preference ≠ OS | Documented; Bootstrap gate prevents post-splash flash |
