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

export function monthBalance(transactions: Transaction[], ym: string): number {
  const { income, expense } = monthTotals(transactions, ym);
  return round2(income - expense);
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

export function combinedShares(
  expenseTotal: number,
  incomeTotal: number,
): { expense: number; income: number } {
  const total = expenseTotal + incomeTotal;
  if (total <= 0) return { expense: 0, income: 0 };
  return {
    expense: round1((expenseTotal / total) * 100),
    income: round1((incomeTotal / total) * 100),
  };
}

export function monthYearFromDate(date: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})/.exec(date);
  const now = new Date();
  if (!match) return { year: now.getFullYear(), month: now.getMonth() };
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return { year: now.getFullYear(), month: now.getMonth() };
  return { year: Number(match[1]), month };
}
