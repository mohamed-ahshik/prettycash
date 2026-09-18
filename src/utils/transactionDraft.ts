import { ReceiptDraft, Transaction } from '../types';

export function toReceiptDraft(t: Transaction): ReceiptDraft {
  return {
    merchant: t.name,
    amount: t.amount,
    date: t.date,
    time: t.time,
    note: t.note ?? '',
    items: (t.items ?? []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  };
}
