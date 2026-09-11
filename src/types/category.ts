export type CategoryType = 'expense' | 'income';

export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  colorBg: string;
  colorFg: string;
  notes?: string;
}

export interface PresetColor {
  bg: string;
  fg: string;
}
