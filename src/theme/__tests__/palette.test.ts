import { contrastRatio } from '../../utils/contrast';
import { darkColors, lightColors, resolveScheme } from '../palettes';

type Token = keyof typeof darkColors;

const AA_PAIRS: [Token, Token][] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['mutedForeground', 'background'],
  ['mutedForeground', 'card'],
  ['mutedForeground', 'muted'],
  ['primary', 'background'],
  ['primary', 'card'],
  ['primaryForeground', 'primary'],
  ['secondaryForeground', 'secondary'],
  ['secondaryForeground', 'secondaryStrong'],
  ['accentForeground', 'accent'],
  ['incomeText', 'card'],
  ['expenseText', 'card'],
];

describe('dark palette contrast (WCAG AA)', () => {
  it.each(AA_PAIRS)('dark %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrastRatio(darkColors[fg], darkColors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('light palette contrast (regression)', () => {
  it.each(AA_PAIRS)('light %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrastRatio(lightColors[fg], lightColors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

it('dark palette has exactly the light token keys', () => {
  expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
});

describe('resolveScheme', () => {
  it('follows the system scheme when the preference is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('defaults to light when the system scheme is unknown', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });

  it('pins the chosen scheme regardless of the system', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});
