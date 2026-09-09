import { Category } from '../types';
import { colors } from './colors';

export const CATEGORY_STYLES: Record<Category, { bg: string; fg: string }> = {
  Food: { bg: '#DFF0EB', fg: '#00674F' },
  Travel: { bg: '#E8EFFD', fg: '#3B5BDB' },
  Fun: { bg: '#FFEEE3', fg: '#E67E22' },
  Coffee: { bg: '#FFF4D6', fg: '#9C7A00' },
  Income: { bg: '#E8F5E9', fg: '#2E7D32' },
  Other: { bg: colors.muted, fg: colors.mutedForeground },
};
