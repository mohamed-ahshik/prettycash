interface Hsl {
  h: number;
  s: number;
  l: number;
}

const HEX = /^#?([0-9a-fA-F]{6})$/;
const FALLBACK_BG = '#1B2521';
const FALLBACK_FG = '#A3B0AB';

function hexToHsl(hex: string): Hsl | null {
  const match = HEX.exec(hex);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number): string => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function deriveCategoryColors(
  colorBg: string,
  colorFg: string,
  isDark: boolean,
): { colorBg: string; colorFg: string } {
  if (!isDark) return { colorBg, colorFg };
  const bg = hexToHsl(colorBg);
  const fg = hexToHsl(colorFg);
  if (!bg || !fg) return { colorBg: FALLBACK_BG, colorFg: FALLBACK_FG };
  return {
    colorBg: hslToHex(bg.h, bg.s, clamp(bg.l, 0.22, 0.26)),
    colorFg: hslToHex(fg.h, fg.s, clamp(fg.l, 0.75, 0.82)),
  };
}
