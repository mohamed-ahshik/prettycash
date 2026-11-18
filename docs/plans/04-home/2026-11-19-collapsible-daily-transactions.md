# Collapsible Daily Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Home's "Daily transactions" list an accordion where only one date is expanded at a time, with the newest date open by default.

**Architecture:** A new `DailyTransactionList` owns the open-date state and renders one `TransactionGroup` per date. `TransactionGroup` becomes presentational: a pressable header with label, net total, and chevron, plus conditional rows. `HomeScreen` keys the list by month so changing months resets the open date.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript, Jest, `react-test-renderer`.

**Spec:** `docs/specs/04-home/2026-11-19-collapsible-daily-transactions-design.md`

**Implementation status:** Implemented; device verification pending.

## Global Constraints

- Exactly one date expanded at a time; tapping the open date collapses it, leaving all dates collapsed.
- The newest date in the selected month starts expanded.
- Changing the month resets the open date to the newest date.
- Header shows the day label, the day's net total (`group.total`) in the active currency, and a `chevron-up` / `chevron-down`.
- Transaction row behavior is unchanged: tapping a row still opens `EditTransactionSheet`.
- No changes to `groupTransactionsByDay`, the data model, repositories, or dependencies.
- Do not persist the open date.

## Review Focus

- Opening a second date closes the first; never two expanded dates.
- Tapping the open date closes it, and it stays closed when groups re-render.
- Deleting the last transaction in the open date falls back to the newest remaining date.
- Changing the month remounts the list and opens the newest date in that month.
- A single-date month starts open and can collapse to just its header.
- Header total formats correctly for negative, zero, positive, and zero-decimal currencies.
- Tapping a transaction row still opens the edit sheet; the header press does not swallow it.
- Accessibility exposes the expanded state.

---

### Task 1: Build the collapsible date list

**Files:**
- Modify: `src/components/TransactionGroup.tsx`
- Create: `src/components/DailyTransactionList.tsx`
- Modify: `src/screens/HomeScreen.tsx:9,63-69`
- Test: `src/components/__tests__/TransactionGroup.test.tsx`
- Test: `src/components/__tests__/DailyTransactionList.test.tsx`

**Interfaces:**
- Consumes: existing `TransactionGroup` type (`label`, `total`, `transactions`), `formatCurrency`, `useCurrency`, `Icon`.
- Produces:
  - `TransactionGroupProps`: `{ group: TransactionGroupType; expanded: boolean; onToggle: () => void; onPressTransaction?: (t: Transaction) => void }`.
  - `DailyTransactionListProps`: `{ groups: TransactionGroupType[]; onPressTransaction?: (t: Transaction) => void }`.

- [x] **Step 1: Write the failing TransactionGroup test**

Create `src/components/__tests__/TransactionGroup.test.tsx`. Mock `useThemedStyles` as `() => ({})`, `useTheme` as `{ colors: { mutedForeground: '#888' } }`, `useCurrency` as `{ symbol: '$', decimals: 2 }`, and `TransactionRow` as a `Text` rendering `transaction.name`.

Use a group `{ label: 'Today', total: -42.3, transactions: [ ...two transactions... ] }` and assert:

```ts
// collapsed
expect(root.findAllByProps({ children: 'Today' })).toHaveLength(1);
expect(root.findAllByProps({ children: '-$42.30' })).toHaveLength(1);
expect(root.findAllByProps({ children: 'Coffee' })).toHaveLength(0);
// header accessibility
expect(root.findByType(Pressable).props.accessibilityState).toEqual({ expanded: false });
// expanded
expect(root.findAllByProps({ children: 'Coffee' })).toHaveLength(1);
// press
const onToggle = jest.fn();
root.findByType(Pressable).props.onPress();
expect(onToggle).toHaveBeenCalledTimes(1);
```

- [x] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/__tests__/TransactionGroup.test.tsx --runInBand`
Expected: FAIL — the current component takes no `expanded`/`onToggle`, renders all rows, and has no total/chevron header.

- [x] **Step 3: Write the failing DailyTransactionList test**

Create `src/components/__tests__/DailyTransactionList.test.tsx`. Mock `../TransactionGroup` as a `Pressable` whose `Text` child reads `` `${group.label}:${expanded ? 'open' : 'closed'}` `` and whose `onPress` is `onToggle`.

Use groups `[{ label: 'Today', total: 0, transactions: [] }, { label: 'Yesterday', total: 0, transactions: [] }]`. Define `texts(root)` to collect the mock `Text` children in render order, and `pressSecond(root)` as `root.findAllByType(Pressable)[1].props.onPress()`. Assert:

```ts
// initial
expect(texts(root)).toEqual(['Today:open', 'Yesterday:closed']);
// open yesterday
pressSecond(root);
expect(texts(root)).toEqual(['Today:closed', 'Yesterday:open']);
// collapse yesterday
pressSecond(root);
expect(texts(root)).toEqual(['Today:closed', 'Yesterday:closed']);
// open-group removal fallback
// update with only Yesterday; expect ['Yesterday:open']
```

- [x] **Step 4: Run it to verify it fails**

Run: `npm test -- src/components/__tests__/DailyTransactionList.test.tsx --runInBand`
Expected: FAIL — `DailyTransactionList` does not exist.

- [x] **Step 5: Implement the collapsible header in TransactionGroup**

Replace the static header `View` with a `Pressable`:

- `onPress={onToggle}`
- `accessibilityRole="button"`
- `accessibilityState={{ expanded }}`
- Left: existing `text.overline` label.
- Right: `formatCurrency(group.total, symbol, decimals)` in `colors.mutedForeground`, plus `Icon` with `chevron-up` when expanded and `chevron-down` otherwise.
- Render `group.transactions.map(...)` only when `expanded`.
- Keep `showDivider={index > 0}` and `onPressTransaction`.

Add `useTheme`, `useCurrency`, `formatCurrency`, and `Icon` imports. Add `headerRight` and `total` styles; keep `header` as a row with `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`.

- [x] **Step 6: Implement DailyTransactionList**

Create `src/components/DailyTransactionList.tsx`:

```ts
export function DailyTransactionList({ groups, onPressTransaction }: DailyTransactionListProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(groups[0]?.label ?? null);

  useEffect(() => {
    if (openLabel && !groups.some((group) => group.label === openLabel)) {
      setOpenLabel(groups[0]?.label ?? null);
    }
  }, [groups, openLabel]);

  return (
    <>
      {groups.map((group) => (
        <TransactionGroup
          key={group.label}
          group={group}
          expanded={group.label === openLabel}
          onToggle={() =>
            setOpenLabel((current) => (current === group.label ? null : group.label))
          }
          onPressTransaction={onPressTransaction}
        />
      ))}
    </>
  );
}
```

- [x] **Step 7: Wire it into HomeScreen**

Replace the `groups.map(...)` block with:

```tsx
<DailyTransactionList key={ym} groups={groups} onPressTransaction={setEditing} />
```

Remove the now-unused `TransactionGroup` import and add the `DailyTransactionList` import. Keep the existing `groups.length === 0` empty state.

- [x] **Step 8: Run the focused tests**

Run: `npm test -- src/components/__tests__/TransactionGroup.test.tsx src/components/__tests__/DailyTransactionList.test.tsx --runInBand`
Expected: PASS.

- [x] **Step 9: Run the full checks**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test -- --runInBand`
Expected: PASS, all suites.

- [x] **Step 10: Commit**

```bash
git add src/components/TransactionGroup.tsx src/components/DailyTransactionList.tsx src/screens/HomeScreen.tsx src/components/__tests__/TransactionGroup.test.tsx src/components/__tests__/DailyTransactionList.test.tsx
git commit -m "feat: make daily transaction groups collapsible"
```

---

### Task 2: Update documentation and run final verification

**Files:**
- Modify: `docs/specs/04-home/2026-11-19-collapsible-daily-transactions-design.md`
- Modify: `docs/plans/04-home/2026-11-19-collapsible-daily-transactions.md`
- Modify: `docs/plans/plans-index.md:12`

**Interfaces:**
- Consumes: the behavior shipped in Task 1.
- Produces: documentation that matches the code.

- [x] **Step 1: Update statuses**

Set the spec's `**Implementation status:**` to `Implemented; device verification pending.` Do the same in this plan's header and final section.

- [x] **Step 2: Tick the plan**

Mark every completed step in Task 1 and Task 2 as `- [x]`, leaving the device checklist item unticked.

- [x] **Step 3: Index the plan**

Add `[[2026-11-19-collapsible-daily-transactions]]` to the Home row of `docs/plans/plans-index.md`.

- [x] **Step 4: Full checks**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 5: Device verification (developer-run)**

On the development build:

- Home opens with the newest date expanded and every other date collapsed.
- Tap another date → it opens and the previous date closes.
- Tap the open date → all dates collapse.
- Change the month → the newest date in that month opens.
- Tap a transaction row → the edit sheet opens.
- Delete the last transaction in the open date → the newest remaining date opens.
- Check a month with income-only and expense-only days; the header total is correct.
- Switch currency → header totals update.

- [x] **Step 6: Commit**

```bash
git add docs/specs/04-home/2026-11-19-collapsible-daily-transactions-design.md docs/plans/04-home/2026-11-19-collapsible-daily-transactions.md docs/plans/plans-index.md
git commit -m "docs: document collapsible daily transactions"
```

---

## Implementation status

Implemented; device verification pending.
