export interface RecurringItem {
  id: string;
  name: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  icon: string;
  colorBg: string;
  colorFg: string;
  dayOfMonth: number; // 1-31
  active: boolean;
}

export interface UserProfile {
  name: string;
  initial: string;
  email: string;
  memberSince: string;
  currency: string;
  notificationsEnabled: boolean;
  hapticsEnabled: boolean;
}
