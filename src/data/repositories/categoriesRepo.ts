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
    color_fg: input.colorFg, notes: input.notes,
  }).select().single();
  if (error) throw error;
  return mapCategoryRow(data);
}
