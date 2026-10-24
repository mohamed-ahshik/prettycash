export type CategoryType = 'expense' | 'income';

export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  colorBg: string;
  colorFg: string;
  notes?: string;
  isUncategorized?: boolean;
}

export interface PresetColor {
  bg: string;
  fg: string;
}
