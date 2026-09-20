import { deriveCategoryColors } from '../categoryColors';

describe('deriveCategoryColors', () => {
  it('returns the stored pair unchanged in light mode', () => {
    expect(deriveCategoryColors('#DFF0EB', '#00674F', false)).toEqual({
      colorBg: '#DFF0EB',
      colorFg: '#00674F',
    });
  });

  it('darkens the background and lightens the foreground', () => {
    expect(deriveCategoryColors('#DFF0EB', '#00674F', true)).toEqual({
      colorBg: '#2A5A4C',
      colorFg: '#80FFE1',
    });
  });

  it('preserves hue for a violet preset', () => {
    expect(deriveCategoryColors('#F3E8FF', '#7C3AED', true)).toEqual({
      colorBg: '#3F0085',
      colorFg: '#B18AF4',
    });
  });

  it('handles a warm accent preset', () => {
    expect(deriveCategoryColors('#FFEEE3', '#E67E22', true)).toEqual({
      colorBg: '#853400',
      colorFg: '#F2BC8C',
    });
  });

  it('falls back to the neutral dark pair when either hex is invalid', () => {
    expect(deriveCategoryColors('nope', '#00674F', true)).toEqual({
      colorBg: '#1B2521',
      colorFg: '#A3B0AB',
    });
    expect(deriveCategoryColors('#DFF0EB', '#zzzzzz', true)).toEqual({
      colorBg: '#1B2521',
      colorFg: '#A3B0AB',
    });
  });
});
