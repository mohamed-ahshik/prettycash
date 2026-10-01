import { CategoryItem, LineItem, RecurringItem, Transaction, UserProfile } from '../../types';

export function mapCategoryRow(row: any): CategoryItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon ?? undefined,
    colorBg: row.color_bg ?? '#DFF0EB',
    colorFg: row.color_fg ?? '#00674F',
    notes: row.notes ?? undefined,
  };
}

export function mapLineItemRow(row: any): LineItem {
  return { id: row.id, name: row.name, quantity: row.quantity ?? undefined, price: Number(row.price) };
}

export function mapTransactionRow(row: any): Transaction {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    time: row.time ?? '',
    categoryId: row.category_id ?? '',
    type: row.type,
    amount: Number(row.amount),
    icon: row.icon ?? 'receipt',
    note: row.note ?? undefined,
    receiptPath: row.receipt_path ?? undefined,
    receiptData: row.receipt_data ?? undefined,
    items: Array.isArray(row.transaction_items) && row.transaction_items.length
      ? row.transaction_items.map(mapLineItemRow)
      : undefined,
  };
}

export function mapRecurringRow(row: any): RecurringItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: Number(row.amount),
    category: row.category_name ?? '',
    icon: row.icon ?? 'calendar',
    colorBg: row.color_bg ?? '#F3E8FF',
    colorFg: row.color_fg ?? '#7C3AED',
    dayOfMonth: row.day_of_month ?? 1,
    active: row.active,
  };
}

export function mapProfileRow(row: any): UserProfile {
  const themePreference =
    row.theme_preference === 'light' || row.theme_preference === 'dark' || row.theme_preference === 'system'
      ? row.theme_preference
      : 'system';

  return {
    name: row.name ?? '',
    initial: (row.name ?? '?').charAt(0).toUpperCase(),
    email: row.email ?? '',
    currency: row.currency ?? 'USD ($)',
    notificationsEnabled: row.notifications_enabled,
    hapticsEnabled: row.haptics_enabled,
    themePreference,
    memberSince: row.member_since ?? '',
  };
}
