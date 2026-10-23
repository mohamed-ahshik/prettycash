import { supabase } from '../../lib/supabase';
import { CategoryItem } from '../../types';
import { mapCategoryRow } from './mappers';

export async function listCategories(): Promise<CategoryItem[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapCategoryRow);
}

export async function insertCategory(input: Omit<CategoryItem, 'id'>): Promise<CategoryItem> {
  const { data, error } = await supabase.from('categories').insert({
    name: input.name, type: input.type, icon: input.icon, color_bg: input.colorBg,
    color_fg: input.colorFg, notes: input.notes, is_uncategorized: input.isUncategorized ?? false,
  }).select().single();
  if (error) throw error;
  return mapCategoryRow(data);
}

export async function updateCategory(
  id: string,
  input: Pick<CategoryItem, 'name' | 'notes'>,
): Promise<CategoryItem> {
  const { data, error } = await supabase.from('categories')
    .update({ name: input.name, notes: input.notes ?? null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCategoryRow(data);
}
