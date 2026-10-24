import { colors } from './colors';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeScheme = 'light' | 'dark';

export const lightColors = { ...colors, canvas: '#EEF2F0' } as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string };

export const darkColors: ThemeColors = {
  background: '#0D1412',
  foreground: '#ECF2EF',
  card: '#151D1A',
  primary: '#34D399',
  primaryPressed: '#2BAF85',
  primaryForeground: '#06231B',
  secondary: '#1C2C26',
  secondaryStrong: '#274039',
  secondaryForeground: '#A8E6CF',
  muted: '#1B2521',
  mutedForeground: '#A3B0AB',
  accent: '#2E211A',
  accentForeground: '#F0C3A4',
  border: '#263330',
  ring: '#34D399',
  incomeText: '#7BDFA0',
  expenseText: '#F87171',
  overlay: 'rgba(0,0,0,0.6)',
  dangerSurface: '#2E1A18',
  canvas: '#0A0E0D',
};

export function resolveScheme(
  preference: ThemePreference,
  systemScheme: ThemeScheme | null | undefined,
): ThemeScheme {
  if (preference === 'system') return systemScheme ?? 'light';
  return preference;
}
