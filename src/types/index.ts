export type TransactionType = 'income' | 'expense';

export interface LineItem {
  id: string;
  name: string;
  quantity?: number;
  price: number;
}

export interface Transaction {
  id: string;
  name: string;
  date: string;
  time: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  icon: string;
  note?: string;
  items?: LineItem[];
  receiptPath?: string;
  receiptData?: unknown;
}

export interface TransactionGroup {
  label: string;
  total: number;
  transactions: Transaction[];
}

export interface ReceiptDraft {
  merchant: string;
  amount: number;
  date?: string;
  time?: string;
  note: string;
  items: { name: string; quantity?: number; price: number }[];
  categoryId?: string;
  categoryConfidence?: number;
}

export * from './category';
export * from './insights';
export * from './profile';
