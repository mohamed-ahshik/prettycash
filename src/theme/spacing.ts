import { ViewStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const shadows: Record<'e1' | 'e2' | 'e3', ViewStyle> = {
  e1: {
    boxShadow: [
      { offsetX: 0, offsetY: 1, blurRadius: 2, color: 'rgba(16,24,22,0.04)' },
      { offsetX: 0, offsetY: 4, blurRadius: 12, color: 'rgba(16,24,22,0.05)' },
    ],
  },
  e2: {
    boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 24, color: 'rgba(16,24,22,0.10)' }],
  },
  e3: {
    boxShadow: [{ offsetX: 0, offsetY: 16, blurRadius: 40, color: 'rgba(0,0,0,0.18)' }],
  },
};
