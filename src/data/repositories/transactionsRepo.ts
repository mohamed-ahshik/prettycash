import { supabase } from '../../lib/supabase';
import { Transaction } from '../../types';
import { mapTransactionRow } from './mappers';

export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions')
    .select('*, transaction_items(*)')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTransactionRow);
}

export async function insertTransaction(input: Omit<Transaction, 'id'>): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').insert({
    name: input.name, date: input.date, time: input.time, category_id: input.categoryId || null,
    type: input.type, amount: input.amount, icon: input.icon, note: input.note ?? null,
    receipt_path: input.receiptPath ?? null,
    receipt_data: input.receiptData ?? null,
  }).select().single();
  if (error) throw error;
  if (input.items && input.items.length) {
    const { error: itemsError } = await supabase.from('transaction_items').insert(
      input.items.map((it, i) => ({ transaction_id: data.id, name: it.name, quantity: it.quantity ?? null, price: it.price, position: i }))
    );
    if (itemsError) throw itemsError;
  }
  return mapTransactionRow({ ...data, transaction_items: input.items ?? [] });
}

export async function updateTransaction(
  id: string,
  input: Omit<Transaction, 'id'>,
): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').update({
    name: input.name, date: input.date, time: input.time, category_id: input.categoryId || null,
    type: input.type, amount: input.amount, icon: input.icon, note: input.note ?? null,
  }).eq('id', id).select().single();
  if (error) throw error;

  const { error: deleteError } = await supabase.from('transaction_items').delete().eq('transaction_id', id);
  if (deleteError) throw deleteError;

  if (input.items && input.items.length) {
    const { error: itemsError } = await supabase.from('transaction_items').insert(
      input.items.map((it, i) => ({ transaction_id: id, name: it.name, quantity: it.quantity ?? null, price: it.price, position: i })),
    );
    if (itemsError) throw itemsError;
  }

  return mapTransactionRow({ ...data, transaction_items: input.items ?? [] });
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}
