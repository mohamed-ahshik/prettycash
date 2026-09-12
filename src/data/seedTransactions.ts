import { Transaction } from '../types';

export const seedTransactions: Transaction[] = [
  { id: '1', name: 'Whole Foods Market', date: '2026-09-09', time: '9:42 AM', categoryId: 'exp-food', type: 'expense', amount: 86.4, icon: 'cart-outline' },
  { id: '2', name: 'Uber', date: '2026-09-09', time: '8:15 AM', categoryId: 'exp-travel', type: 'expense', amount: 24.8, icon: 'car-outline' },
  { id: '3', name: 'Netflix', date: '2026-09-08', time: '7:30 PM', categoryId: 'exp-fun', type: 'expense', amount: 15.99, icon: 'play' },
  { id: '4', name: 'Coffee Run', date: '2026-09-08', time: '8:05 AM', categoryId: 'exp-drinks', type: 'expense', amount: 6.2, icon: 'coffee-outline' },
  { id: '5', name: 'Salary September', date: '2026-09-01', time: '9:00 AM', categoryId: 'inc-salary', type: 'income', amount: 5200, icon: 'briefcase-outline' },
];
