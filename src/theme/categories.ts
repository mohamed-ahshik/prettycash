import { Category } from '../types';
import { colors } from './colors';

export const CATEGORY_STYLES: Record<Category, { bg: string; fg: string; label: string }> = {
  Food: { bg: '#DFF0EB', fg: '#00674F', label: 'Food' },
  Travel: { bg: '#E8EFFD', fg: '#3B5BDB', label: 'Travel' },
  Fun: { bg: '#FFEEE3', fg: '#E67E22', label: 'Fun' },
  Coffee: { bg: '#FFF4D6', fg: '#9C7A00', label: 'Food' },
  Income: { bg: '#E8F5E9', fg: '#2E7D32', label: 'Income' },
  Other: { bg: colors.muted, fg: colors.mutedForeground, label: 'Other' },
};
