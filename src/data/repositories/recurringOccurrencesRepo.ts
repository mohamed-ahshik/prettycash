import { supabase } from '../../lib/supabase';
import { RecurringOccurrence } from '../../types';
import { mapRecurringRow } from './mappers';

export async function listPendingRecurringOccurrences(): Promise<RecurringOccurrence[]> {
  const { data, error } = await supabase
    .from('recurring_occurrences')
    .select('*, recurring_items(*)')
    .eq('status', 'pending')
    .order('occurrence_date', { ascending: true });
  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.recurring_items)
    .map((row) => ({
      id: row.id,
      recurringItemId: row.recurring_item_id,
      occurrenceDate: row.occurrence_date,
      status: row.status,
      transactionId: row.transaction_id ?? null,
      item: mapRecurringRow(row.recurring_items),
    }));
}

export async function resolveRecurringOccurrence(
  occurrenceId: string,
  decision: 'post' | 'skip',
): Promise<string | null> {
  const { data, error } = await supabase.rpc('resolve_recurring_occurrence', {
    p_occurrence_id: occurrenceId,
    p_decision: decision,
  });
  if (error) throw error;
  return data ?? null;
}
