# Hide/Show Balance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the eye beside "Total balance" toggle masking of the Total balance / Income / Expense values, with a closed-eye icon when hidden, persisted across restarts.

**Architecture:** A small `AsyncStorage` preference module plus a `useBalanceVisibility` hook drive a `Pressable` eye in `BalanceCard`; hidden values render dotted masks.

**Tech Stack:** React Native (Expo SDK ~57), TypeScript, `@react-native-async-storage/async-storage`, `jest-expo`.

## Global Constraints

- Expo SDK `~57.0.21`/`~57.0.23`; consult https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.
- No code comments in source. No new dependencies (`@react-native-async-storage/async-storage` is already installed).
- `npx tsc --noEmit` and `npm test` must pass after each task.
- Only the card's three values are hidden; labels stay; the transaction list is unaffected.
- Persist device-locally only (no Supabase schema change).
- The working tree may contain unrelated uncommitted changes; stage only the files each task names.

**Implementation status:** Not started

---

### Task 1: Persistence helpers

**Files:**
- Create: `src/lib/balanceVisibility.ts`
- Test: `src/lib/__tests__/balanceVisibility.test.ts`

**Interfaces:**
- Produces: `loadBalanceHidden(): Promise<boolean>`, `saveBalanceHidden(hidden: boolean): Promise<void>`, and the mask constants `BALANCE_MASK` (`'••••••'`), `INCOME_MASK` (`'+••••'`), `EXPENSE_MASK` (`'••••'`).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/balanceVisibility.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadBalanceHidden, saveBalanceHidden } from '../balanceVisibility';

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('defaults to visible when unset', async () => {
  await expect(loadBalanceHidden()).resolves.toBe(false);
});

it('round-trips the hidden flag', async () => {
  await saveBalanceHidden(true);
  await expect(loadBalanceHidden()).resolves.toBe(true);
  await saveBalanceHidden(false);
  await expect(loadBalanceHidden()).resolves.toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/balanceVisibility.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/balanceVisibility.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'prettycash:balanceHidden';

export const BALANCE_MASK = '••••••';
export const INCOME_MASK = '+••••';
export const EXPENSE_MASK = '••••';

export async function loadBalanceHidden(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function saveBalanceHidden(hidden: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, hidden ? '1' : '0');
  } catch {}
}
```

- [ ] **Step 4: Run test and verify compile**

Run: `npx jest src/lib/__tests__/balanceVisibility.test.ts` then `npx tsc --noEmit && npm test`
Expected: PASS / success.

- [ ] **Step 5: Commit**

```bash
git add src/lib/balanceVisibility.ts src/lib/__tests__/balanceVisibility.test.ts
git commit -m "feat: add persisted balance visibility preference"
```

---

### Task 2: Hook + card wiring + spec status

**Files:**
- Create: `src/hooks/useBalanceVisibility.ts`
- Modify: `src/components/BalanceCard.tsx`
- Modify: `docs/superpowers/specs/2026-09-18-hide-show-balance-design.md`

**Interfaces:**
- Consumes: the helpers from Task 1.
- Produces: `useBalanceVisibility(): { hidden: boolean; toggle: () => void }`.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useBalanceVisibility.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { loadBalanceHidden, saveBalanceHidden } from '../lib/balanceVisibility';

export function useBalanceVisibility() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;
    loadBalanceHidden().then((value) => {
      if (active) setHidden(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      saveBalanceHidden(next);
      return next;
    });
  }, []);

  return { hidden, toggle };
}
```

- [ ] **Step 2: Wire the card**

In `src/components/BalanceCard.tsx`:

Add `Pressable` to the react-native import and add the new imports:

```ts
import { Pressable, StyleSheet, Text, View } from 'react-native';
```
```ts
import { useBalanceVisibility } from '../hooks/useBalanceVisibility';
import { BALANCE_MASK, EXPENSE_MASK, INCOME_MASK } from '../lib/balanceVisibility';
```

Inside the component, before `return`:

```ts
  const { hidden, toggle } = useBalanceVisibility();
```

Replace the static eye icon inside `balanceLabelRow` with a pressable toggle:

```tsx
            <Pressable
              onPress={toggle}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
            >
              <Icon
                name={hidden ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
```

Replace the three values:

```tsx
          <Text style={styles.balanceValue}>{hidden ? BALANCE_MASK : formatCurrency(total)}</Text>
```
```tsx
              <Text style={styles.splitValue}>{hidden ? INCOME_MASK : `+$${formatMoney(income)}`}</Text>
```
```tsx
              <Text style={styles.splitValue}>{hidden ? EXPENSE_MASK : `$${formatMoney(expense)}`}</Text>
```

- [ ] **Step 3: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 4: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-18-hide-show-balance-design.md`, set:

```
**Implementation status:** Implemented
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBalanceVisibility.ts src/components/BalanceCard.tsx docs/superpowers/specs/2026-09-18-hide-show-balance-design.md
git commit -m "feat: toggle balance visibility from the eye icon"
```
