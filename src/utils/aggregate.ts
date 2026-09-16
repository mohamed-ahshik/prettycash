import { CategoryBreakdownItem, CategoryItem, Transaction, TransactionType } from '../types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function filterByMonth(transactions: Transaction[], ym: string): Transaction[] {
  return transactions.filter((t) => monthKey(t.date) === ym);
}

export function monthTotals(
  transactions: Transaction[],
  ym: string,
): { income: number; expense: number } {
  const month = filterByMonth(transactions, ym);
  const income = month.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = month.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income: round2(income), expense: round2(expense) };
}

export function allTimeBalance(transactions: Transaction[]): number {
  return round2(
    transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
  );
}

export function categoryBreakdown(
  transactions: Transaction[],
  categories: CategoryItem[],
  type: TransactionType,
  ym: string,
): { total: number; items: CategoryBreakdownItem[] } {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of filterByMonth(transactions, ym)) {
    if (t.type !== type) continue;
    const id = t.categoryId && byId.has(t.categoryId) ? t.categoryId : 'uncategorized';
    totals.set(id, (totals.get(id) ?? 0) + t.amount);
  }

  const total = round2(Array.from(totals.values()).reduce((s, v) => s + v, 0));
  if (total <= 0) return { total: 0, items: [] };

  const items = Array.from(totals.entries())
    .map(([id, amount]) => {
      const cat = byId.get(id);
      const rounded = round2(amount);
      return {
        id,
        name: cat?.name ?? 'Uncategorized',
        amount: rounded,
        percentage: round1((rounded / total) * 100),
        icon: cat?.icon ?? 'help-circle-outline',
        color: cat?.colorFg ?? '#6B7280',
        bgColor: cat?.colorBg ?? '#F3F4F6',
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { total, items };
}
