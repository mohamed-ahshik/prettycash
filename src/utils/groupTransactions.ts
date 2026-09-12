import { Transaction, TransactionGroup } from '../types';

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayLabel(dateStr: string, today: Date): string {
  const d = startOfDay(parseDate(dateStr));
  const t = startOfDay(today);
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function groupTransactionsByDay(
  transactions: Transaction[],
  today: Date = new Date()
): TransactionGroup[] {
  const sorted = [...transactions].sort(
    (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
  );
  const map = new Map<string, Transaction[]>();
  for (const t of sorted) {
    const label = dayLabel(t.date, today);
    const list = map.get(label) ?? [];
    list.push(t);
    map.set(label, list);
  }
  return Array.from(map.entries()).map(([label, list]) => ({
    label,
    total: list.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
    transactions: list,
  }));
}
