import React, { useEffect, useState } from 'react';
import { Transaction, TransactionGroup as TransactionGroupType } from '../types';
import { TransactionGroup } from './TransactionGroup';

interface DailyTransactionListProps {
  groups: TransactionGroupType[];
  onPressTransaction?: (t: Transaction) => void;
}

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
