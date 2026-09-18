import { supabase } from '../../lib/supabase';
import { RecurringItem } from '../../types';
import { mapRecurringRow } from './mappers';

export async function listRecurring(): Promise<RecurringItem[]> {
  const { data, error } = await supabase.from('recurring_items').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapRecurringRow);
}

export async function insertRecurring(input: Omit<RecurringItem, 'id' | 'active'>): Promise<RecurringItem> {
  const { data, error } = await supabase.from('recurring_items').insert({
    name: input.name, type: input.type, amount: input.amount, category_name: input.category,
    icon: input.icon, color_bg: input.colorBg, color_fg: input.colorFg, day_of_month: input.dayOfMonth, active: true,
  }).select().single();
  if (error) throw error;
  return mapRecurringRow(data);
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('recurring_items').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_items').delete().eq('id', id);
  if (error) throw error;
}
