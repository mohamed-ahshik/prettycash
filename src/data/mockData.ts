import { TransactionGroup } from '../types';

export const mockUser = {
  name: 'Maya',
  initial: 'M',
  date: 'Tue, Sep 9',
};

export const mockMonth = 'September 2026';

export const mockBalance = {
  total: 4280.5,
  income: 5200,
  expense: 2140,
};

export const mockTransactions: TransactionGroup[] = [
  {
    label: 'Today • Sep 9',
    total: -86.4,
    transactions: [
      { id: '1', name: 'Whole Foods Market', time: '9:42 AM', category: 'Food', type: 'expense', amount: 86.4, icon: 'cart-outline' },
      { id: '2', name: 'Uber', time: '8:15 AM', category: 'Travel', type: 'expense', amount: 24.8, icon: 'car-outline' },
    ],
  },
  {
    label: 'Yesterday • Sep 8',
    total: -22.19,
    transactions: [
      { id: '3', name: 'Netflix', time: '7:30 PM', category: 'Fun', type: 'expense', amount: 15.99, icon: 'play' },
      { id: '4', name: 'Coffee Run', time: '8:05 AM', category: 'Coffee', type: 'expense', amount: 6.2, icon: 'coffee-outline' },
    ],
  },
  {
    label: 'Sep 1',
    total: 5200,
    transactions: [
      { id: '5', name: 'Salary September', time: '9:00 AM', category: 'Income', type: 'income', amount: 5200, icon: 'briefcase-outline' },
    ],
  },
];
