import React, { useState } from 'react';
import { Transaction, TransactionGroup as TransactionGroupType } from '../types';
import { TransactionGroup } from './TransactionGroup';

interface DailyTransactionListProps {
  groups: TransactionGroupType[];
  onPressTransaction?: (t: Transaction) => void;
}

export function DailyTransactionList({ groups, onPressTransaction }: DailyTransactionListProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(groups[0]?.label ?? null);

  // Derive the active label during render: if the open date disappears, fall
  // back to the newest remaining date without an extra collapsed frame.
  const activeLabel =
    openLabel === null || groups.some((group) => group.label === openLabel)
      ? openLabel
      : (groups[0]?.label ?? null);

  return (
    <>
      {groups.map((group) => (
        <TransactionGroup
          key={group.label}
          group={group}
          expanded={group.label === activeLabel}
          onToggle={() => setOpenLabel(activeLabel === group.label ? null : group.label)}
          onPressTransaction={onPressTransaction}
        />
      ))}
    </>
  );
}
