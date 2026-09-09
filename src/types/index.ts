export type Category = 'Food' | 'Travel' | 'Fun' | 'Coffee' | 'Income' | 'Other';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  name: string;
  time: string;
  category: Category;
  type: TransactionType;
  amount: number;
  icon: string;
}

export interface TransactionGroup {
  label: string;
  total: number;
  transactions: Transaction[];
}
