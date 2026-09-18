# PrettyCash — Hide/Show Balance (Spec)

**Date:** 2026-09-18
**Status:** Approved for implementation
**Implementation status:** Implemented

---

## 1. Overview & Objective

The eye icon beside "Total balance" is decorative. Make it functional: tapping it hides the **Total balance**, **Income**, and **Expense** values in the card, and the icon switches to a closed eye. Tapping again reveals them. The hidden state persists across app restarts.

---

## 2. Behavior

- The eye sits next to the "Total balance" label in `BalanceCard`.
- **Visible (default):** `eye-outline`; values render normally (`$4,280.50`, `+$5,200`, `$2,140`).
- **Hidden:** `eye-off-outline` (closed); the three values render as dotted masks:
  - Total balance → `••••••`
  - Income → `+••••`
  - Expense → `••••`
- Labels ("Total balance", "Income", "Expense") remain visible; only the values are masked.
- Only the card's three values are hidden — the Daily transactions list and everything else stay unchanged.
- The toggle is per-session immediate and persisted (see §4).

---

## 3. Scope

In scope: the `BalanceCard` eye and its three values; persistence of the hidden flag.

Out of scope: transaction-list amounts; animating the transition; syncing the flag across devices; hiding anything on Insights/Profile.

---

## 4. Persistence

- Device-local via `AsyncStorage` (the same mechanism already used for the auth session), so it survives app restarts.
- Key: `prettycash:balanceHidden`; stored value `'1'` (hidden) / `'0'` (visible).
- Default when unset (or on read failure): **visible**.
- Not synced to the Supabase profile (no schema change).

---

## 5. Implementation

### 5.1 Storage helpers — `src/lib/balanceVisibility.ts`
```ts
export const BALANCE_MASK = '••••••';
export const INCOME_MASK = '+••••';
export const EXPENSE_MASK = '••••';
export async function loadBalanceHidden(): Promise<boolean>;
export async function saveBalanceHidden(hidden: boolean): Promise<void>;
```
- `loadBalanceHidden` returns `false` on any read error.
- `saveBalanceHidden` swallows write errors (best-effort preference).

### 5.2 Hook — `src/hooks/useBalanceVisibility.ts`
```ts
export function useBalanceVisibility(): { hidden: boolean; toggle: () => void };
```
- On mount, loads the persisted value (guarded against unmount).
- `toggle` flips state and persists the new value.

### 5.3 Card — `src/components/BalanceCard.tsx`
- Use the hook; wrap the eye in a `Pressable` that calls `toggle`.
- Icon: `hidden ? 'eye-off-outline' : 'eye-outline'`.
- Values: when `hidden`, render the masks from §5.1; otherwise the existing `formatCurrency`/`formatMoney` output.
- Accessibility: the eye `Pressable` gets `accessibilityRole="button"` and `accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}`, plus generous `hitSlop`.

---

## 6. Testing

- Unit-test `loadBalanceHidden`/`saveBalanceHidden` round-trip and default using the existing AsyncStorage jest mock (as `supabaseStorage.test.ts` does).
- `npx tsc --noEmit` and `npm test` must pass.
- Manual: tap the eye → values mask and icon closes; restart the app → still hidden; tap again → values return, icon opens, and the state stays after another restart.
