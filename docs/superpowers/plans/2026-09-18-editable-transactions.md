# Editable Transactions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a saved transaction be edited and deleted from Home by tapping its row.

**Architecture:** Add `updateTransaction`/`deleteTransaction` to the repository and context; extend `TransactionForm` to serve both add and edit (initial type/category/date, custom title/label, optional delete with inline confirm); add an `EditTransactionSheet` that prefills the form via a pure `toReceiptDraft` mapper; and wire tap-through from `TransactionRow` → `TransactionGroup` → `HomeScreen`.

**Tech Stack:** React Native (Expo SDK ~57), TypeScript, Supabase, `jest-expo`.

## Global Constraints

- **Ordering:** implement the `2026-09-18-receipt-date-and-receipt-data` plan **first** — it adds `receiptDate` and `initialDate` props (and the `initialDate ?? todayString()` date initializer) to `TransactionForm`, which this plan builds on.
- Expo SDK `~57.0.21`/`~57.0.23`; consult https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.
- No code comments in source. No new dependencies.
- `npx tsc --noEmit` and `npm test` must pass after each task.
- Editing the date must **not** move Home's selected month.
- `receipt_path`/`receipt_data` are never written by the update path.
- No native `Alert` for delete (keep web parity) — use an inline confirmation.
- The working tree may contain unrelated uncommitted changes; stage only the files each task names.

**Implementation status:** Implemented

---

### Task 1: Repository `updateTransaction` / `deleteTransaction`

**Files:**
- Modify: `src/data/repositories/transactionsRepo.ts`
- Test: `src/data/repositories/__tests__/transactionsRepo.test.ts`

**Interfaces:**
- Produces: `updateTransaction(id: string, input: Omit<Transaction, 'id'>): Promise<Transaction>` and `deleteTransaction(id: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `src/data/repositories/__tests__/transactionsRepo.test.ts`:

```ts
jest.mock('../../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '../../../lib/supabase';
import { deleteTransaction, updateTransaction } from '../transactionsRepo';

const from = supabase.from as unknown as jest.Mock;

beforeEach(() => {
  from.mockReset();
});

it('updates a transaction and replaces its items', async () => {
  const single = jest.fn().mockResolvedValue({
    data: {
      id: 't1', name: 'New', date: '2026-09-18', time: '1:00 PM', category_id: 'c1',
      type: 'expense', amount: 5, icon: 'x', note: null, receipt_path: null, receipt_data: null,
    },
    error: null,
  });
  const update = jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single })) })) }));
  const itemsEq = jest.fn().mockResolvedValue({ error: null });
  const itemsDelete = jest.fn(() => ({ eq: itemsEq }));
  const itemsInsert = jest.fn().mockResolvedValue({ error: null });
  from.mockImplementation((table: string) =>
    table === 'transactions' ? { update } : { delete: itemsDelete, insert: itemsInsert },
  );

  const out = await updateTransaction('t1', {
    name: 'New', date: '2026-09-18', time: '1:00 PM', categoryId: 'c1', type: 'expense',
    amount: 5, icon: 'x', items: [{ id: 'i1', name: 'Milk', price: 2 }],
  });

  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'New', amount: 5, category_id: 'c1' }),
  );
  expect(itemsDelete).toHaveBeenCalled();
  expect(itemsInsert).toHaveBeenCalledWith([
    expect.objectContaining({ transaction_id: 't1', name: 'Milk', price: 2, position: 0 }),
  ]);
  expect(out.name).toBe('New');
  expect(out.items).toEqual([{ id: 'i1', name: 'Milk', quantity: undefined, price: 2 }]);
});

it('deletes a transaction by id', async () => {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const del = jest.fn(() => ({ eq }));
  from.mockImplementation(() => ({ delete: del }));

  await deleteTransaction('t1');

  expect(del).toHaveBeenCalled();
  expect(eq).toHaveBeenCalledWith('id', 't1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/repositories/__tests__/transactionsRepo.test.ts`
Expected: FAIL — `updateTransaction is not a function`.

- [ ] **Step 3: Implement**

Append to `src/data/repositories/transactionsRepo.ts`:

```ts
export async function updateTransaction(
  id: string,
  input: Omit<Transaction, 'id'>,
): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').update({
    name: input.name, date: input.date, time: input.time, category_id: input.categoryId || null,
    type: input.type, amount: input.amount, icon: input.icon, note: input.note ?? null,
  }).eq('id', id).select().single();
  if (error) throw error;

  const { error: deleteError } = await supabase.from('transaction_items').delete().eq('transaction_id', id);
  if (deleteError) throw deleteError;

  if (input.items && input.items.length) {
    const { error: itemsError } = await supabase.from('transaction_items').insert(
      input.items.map((it, i) => ({ transaction_id: id, name: it.name, quantity: it.quantity ?? null, price: it.price, position: i })),
    );
    if (itemsError) throw itemsError;
  }

  return mapTransactionRow({ ...data, transaction_items: input.items ?? [] });
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 4: Run test and verify compile**

Run: `npx jest src/data/repositories/__tests__/transactionsRepo.test.ts` then `npx tsc --noEmit && npm test`
Expected: PASS / success.

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/transactionsRepo.ts src/data/repositories/__tests__/transactionsRepo.test.ts
git commit -m "feat: add updateTransaction and deleteTransaction"
```

---

### Task 2: Context `updateTransaction` / `deleteTransaction`

**Files:**
- Modify: `src/context/TransactionsContext.tsx`

**Interfaces:**
- Consumes: the repo functions from Task 1.
- Produces: `useTransactions()` gains `updateTransaction(id, input): Promise<void>` and `deleteTransaction(id): Promise<void>`.

- [ ] **Step 1: Import the repo functions with aliases**

Change the repository import to:

```ts
import {
  listTransactions,
  insertTransaction,
  updateTransaction as updateTransactionRepo,
  deleteTransaction as deleteTransactionRepo,
} from '../data/repositories/transactionsRepo';
```

- [ ] **Step 2: Extend the context type**

In `interface TransactionsContextType`, add:

```ts
  updateTransaction: (id: string, input: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
```

- [ ] **Step 3: Implement the methods**

Add after `addTransaction`:

```ts
  const updateTransaction = async (id: string, input: Omit<Transaction, 'id'>) => {
    const updated = await updateTransactionRepo(id, input);
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const deleteTransaction = async (id: string) => {
    await deleteTransactionRepo(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };
```

- [ ] **Step 4: Expose them**

Change the provider value to:

```tsx
    <TransactionsContext.Provider
      value={{ transactions, groups, addTransaction, updateTransaction, deleteTransaction, loading, error }}
    >
      {children}
    </TransactionsContext.Provider>
```

- [ ] **Step 5: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/context/TransactionsContext.tsx
git commit -m "feat: expose update and delete transaction from context"
```

---

### Task 3: `toReceiptDraft` helper

**Files:**
- Create: `src/utils/transactionDraft.ts`
- Test: `src/utils/__tests__/transactionDraft.test.ts`

**Interfaces:**
- Produces: `toReceiptDraft(t: Transaction): ReceiptDraft`.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/transactionDraft.test.ts`:

```ts
import { Transaction } from '../../types';
import { toReceiptDraft } from '../transactionDraft';

it('maps a transaction to a receipt draft', () => {
  const t: Transaction = {
    id: 't1', name: 'Cafe', date: '2026-09-18', time: '1:00 PM', categoryId: 'c1',
    type: 'expense', amount: 9.5, icon: 'receipt', note: 'lunch',
    items: [{ id: 'i1', name: 'Latte', quantity: 2, price: 4.75 }],
  };
  expect(toReceiptDraft(t)).toEqual({
    merchant: 'Cafe', amount: 9.5, date: '2026-09-18', time: '1:00 PM', note: 'lunch',
    items: [{ name: 'Latte', quantity: 2, price: 4.75 }],
  });
});

it('defaults note and items when absent', () => {
  const t: Transaction = {
    id: 't2', name: 'X', date: '2026-09-18', time: '', categoryId: '', type: 'income',
    amount: 1, icon: 'receipt',
  };
  expect(toReceiptDraft(t)).toEqual({
    merchant: 'X', amount: 1, date: '2026-09-18', time: '', note: '', items: [],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/transactionDraft.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/utils/transactionDraft.ts`:

```ts
import { ReceiptDraft, Transaction } from '../types';

export function toReceiptDraft(t: Transaction): ReceiptDraft {
  return {
    merchant: t.name,
    amount: t.amount,
    date: t.date,
    time: t.time,
    note: t.note ?? '',
    items: (t.items ?? []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  };
}
```

- [ ] **Step 4: Run test and verify compile**

Run: `npx jest src/utils/__tests__/transactionDraft.test.ts` then `npx tsc --noEmit && npm test`
Expected: PASS / success.

- [ ] **Step 5: Commit**

```bash
git add src/utils/transactionDraft.ts src/utils/__tests__/transactionDraft.test.ts
git commit -m "feat: add transaction to receipt-draft mapper"
```

---

### Task 4: `TransactionForm` edit support

**Files:**
- Modify: `src/components/TransactionForm.tsx`

**Interfaces:**
- Consumes: the `receiptDate` and `initialDate` props added by the receipt-date plan.
- Produces: `TransactionForm` accepts `initialType?: TransactionType`, `initialCategoryId?: string`, `title?: string`, `submitLabel?: string`, `onDelete?: () => void`.

- [ ] **Step 1: Extend the props**

Add to `interface TransactionFormProps`:

```ts
  initialType?: TransactionType;
  initialCategoryId?: string;
  title?: string;
  submitLabel?: string;
  onDelete?: () => void;
```

- [ ] **Step 2: Update the signature and initialize edit fields**

Replace the component signature with:

```ts
export function TransactionForm({
  initial,
  initialType,
  initialCategoryId,
  initialDate,
  title = 'Add Transaction',
  submitLabel = 'Save',
  receiptDate,
  onDelete,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
```

Change the `type` and `categoryId` initializers to:

```ts
  const [type, setType] = useState<TransactionType>(initialType ?? 'expense');
  const [categoryId, setCategoryId] = useState<string | null>(
    initialCategoryId ?? expenseCategories[0]?.id ?? null
  );
```

(The `date` initializer stays `initialDate ?? todayString()` from the receipt-date plan. `receiptDate` remains used by the receipt-date hint.)

- [ ] **Step 3: Use the title and label**

Change the header title text to `{title}`:

```tsx
        <Text style={styles.title}>{title}</Text>
```

Change the save button text to `{submitLabel}`:

```tsx
        <Text style={styles.saveButtonText}>{submitLabel}</Text>
```

- [ ] **Step 4: Add the delete action**

Add state near the other `useState` calls:

```ts
  const [confirmDelete, setConfirmDelete] = useState(false);
```

Insert between the `</ScrollView>` and the save `Pressable`:

```tsx
      {onDelete ? (
        confirmDelete ? (
          <View style={styles.deleteConfirm}>
            <Text style={styles.deleteConfirmText}>Delete this transaction?</Text>
            <View style={styles.deleteConfirmActions}>
              <Pressable style={styles.deleteCancel} onPress={() => setConfirmDelete(false)}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteConfirmButton} onPress={onDelete}>
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.deleteButton} onPress={() => setConfirmDelete(true)}>
            <Text style={styles.deleteButtonText}>Delete transaction</Text>
          </Pressable>
        )
      ) : null}
```

Add these styles to the `StyleSheet`:

```ts
  deleteButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.expenseText,
  },
  deleteConfirm: {
    marginBottom: 12,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  deleteConfirmText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 10,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteCancelText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.expenseText,
  },
  deleteConfirmButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
```

- [ ] **Step 5: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/components/TransactionForm.tsx
git commit -m "feat: support editing in TransactionForm"
```

---

### Task 5: `EditTransactionSheet`

**Files:**
- Create: `src/components/EditTransactionSheet.tsx`

**Interfaces:**
- Consumes: `useTransactions()` update/delete (Task 2), `toReceiptDraft` (Task 3), `TransactionForm` edit props (Task 4).
- Produces: `EditTransactionSheet({ transaction, onClose })`.

- [ ] **Step 1: Create the component**

Create `src/components/EditTransactionSheet.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTransactions } from '../context/TransactionsContext';
import { colors, fonts } from '../theme';
import { Transaction } from '../types';
import { toReceiptDraft } from '../utils/transactionDraft';
import { TransactionForm } from './TransactionForm';

interface EditTransactionSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function EditTransactionSheet({ transaction, onClose }: EditTransactionSheetProps) {
  const { updateTransaction, deleteTransaction } = useTransactions();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [transaction]);

  if (!transaction) {
    return null;
  }

  const handleSubmit = async (input: Omit<Transaction, 'id'>) => {
    try {
      await updateTransaction(transaction.id, input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update transaction.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTransaction(transaction.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete transaction.');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />
        <View style={styles.card}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TransactionForm
            initial={toReceiptDraft(transaction)}
            initialType={transaction.type}
            initialCategoryId={transaction.categoryId}
            initialDate={transaction.date}
            title="Edit Transaction"
            submitLabel="Save"
            onDelete={handleDelete}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    height: '88%',
    width: '100%',
    maxWidth: 430,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.expenseText,
    marginBottom: 8,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/EditTransactionSheet.tsx
git commit -m "feat: add EditTransactionSheet"
```

---

### Task 6: Wire tap-to-edit + mark the spec implemented

**Files:**
- Modify: `src/components/TransactionRow.tsx`
- Modify: `src/components/TransactionGroup.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `docs/superpowers/specs/2026-09-18-editable-transactions-design.md`

**Interfaces:**
- Consumes: `EditTransactionSheet` (Task 5).

- [ ] **Step 1: Make the row tappable, drop inline expansion**

Replace `src/components/TransactionRow.tsx` with:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../types';
import { useCategories } from '../context/CategoriesContext';
import { colors, fonts } from '../theme';
import { formatSignedAmount } from '../utils/format';
import { Icon } from './Icon';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const { expenseCategories, incomeCategories } = useCategories();
  const category = [...expenseCategories, ...incomeCategories].find((c) => c.id === transaction.categoryId);
  const bg = category?.colorBg ?? colors.muted;
  const fg = category?.colorFg ?? colors.mutedForeground;
  const iconName = category?.icon ?? transaction.icon;
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.incomeText : colors.foreground;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: bg }]}>
        <Icon name={iconName} size={20} color={fg} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{transaction.name}</Text>
        <Text style={styles.meta}>{transaction.time} • {category?.name ?? 'Other'}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {formatSignedAmount(transaction.type, transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  meta: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
```

- [ ] **Step 2: Pass the press handler through the group**

In `src/components/TransactionGroup.tsx`, add to the props interface:

```ts
  onPressTransaction?: (t: Transaction) => void;
```

Import the `Transaction` type:

```ts
import { Transaction, TransactionGroup as TransactionGroupType } from '../types';
```

Destructure it:

```ts
export function TransactionGroup({ group, onPressTransaction }: TransactionGroupProps) {
```

Pass it to the row:

```tsx
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          onPress={() => onPressTransaction?.(transaction)}
        />
```

- [ ] **Step 3: Host the edit sheet in `HomeScreen`**

In `src/screens/HomeScreen.tsx`, add imports:

```ts
import { EditTransactionSheet } from '../components/EditTransactionSheet';
import { Transaction } from '../types';
```

Add state:

```ts
  const [editing, setEditing] = useState<Transaction | null>(null);
```

Pass the handler to the group:

```tsx
              <TransactionGroup
                key={group.label}
                group={group}
                onPressTransaction={setEditing}
              />
```

Render the sheet after `</ScrollView>` (before or after `MonthYearPickerModal`):

```tsx
      <EditTransactionSheet transaction={editing} onClose={() => setEditing(null)} />
```

- [ ] **Step 4: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 5: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-18-editable-transactions-design.md`, set:

```
**Implementation status:** Implemented
```

- [ ] **Step 6: Commit**

```bash
git add src/components/TransactionRow.tsx src/components/TransactionGroup.tsx src/screens/HomeScreen.tsx docs/superpowers/specs/2026-09-18-editable-transactions-design.md
git commit -m "feat: tap a transaction to edit or delete it"
```
