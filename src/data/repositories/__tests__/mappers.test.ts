import {
  mapCategoryRow, mapTransactionRow, mapRecurringRow, mapProfileRow, mapLineItemRow,
} from '../mappers';

it('maps a category row snake_case to CategoryItem', () => {
  expect(mapCategoryRow({ id: '1', name: 'Food', type: 'expense', icon: 'cart-outline', color_bg: '#DFF0EB', color_fg: '#00674F', notes: 'x' }))
    .toEqual({ id: '1', name: 'Food', type: 'expense', icon: 'cart-outline', colorBg: '#DFF0EB', colorFg: '#00674F', notes: 'x' });
});

it('maps a transaction row and its items', () => {
  const row = {
    id: 't1', name: 'Whole Foods', date: '2026-09-13', time: '9:42 AM',
    category_id: 'c1', type: 'expense', amount: 42.5, icon: 'cart-outline', note: null, receipt_path: null,
    receipt_data: { merchant: 'Whole Foods', amount: 42.5, date: '2026-09-13' },
    transaction_items: [
      { id: 'i1', name: 'Milk', quantity: 2, price: 3.0 },
      { id: 'i2', name: 'Eggs', quantity: null, price: 2.5 },
    ],
  };
  expect(mapTransactionRow(row)).toEqual({
    id: 't1', name: 'Whole Foods', date: '2026-09-13', time: '9:42 AM',
    categoryId: 'c1', type: 'expense', amount: 42.5, icon: 'cart-outline', note: undefined,
    receiptData: { merchant: 'Whole Foods', amount: 42.5, date: '2026-09-13' },
    items: [
      { id: 'i1', name: 'Milk', quantity: 2, price: 3.0 },
      { id: 'i2', name: 'Eggs', quantity: undefined, price: 2.5 },
    ],
  });
});

it('maps recurring and profile rows', () => {
  expect(mapRecurringRow({ id: 'r1', name: 'Rent', type: 'expense', amount: 1200, category_name: 'Bills', icon: 'file-document-outline', color_bg: '#F3E8FF', color_fg: '#7C3AED', day_of_month: 1, active: true }))
    .toEqual({ id: 'r1', name: 'Rent', type: 'expense', amount: 1200, category: 'Bills', icon: 'file-document-outline', colorBg: '#F3E8FF', colorFg: '#7C3AED', dayOfMonth: 1, active: true });
  expect(mapProfileRow({ name: 'Maya', email: 'm@x.co', currency: 'USD ($)', notifications_enabled: true, haptics_enabled: false, member_since: 'Sep 2026' }))
    .toEqual({ name: 'Maya', initial: 'M', email: 'm@x.co', currency: 'USD ($)', notificationsEnabled: true, hapticsEnabled: false, memberSince: 'Sep 2026' });
});
