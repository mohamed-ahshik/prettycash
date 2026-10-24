import { contrastRatio, relativeLuminance } from '../contrast';

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('returns null for invalid hex', () => {
    expect(relativeLuminance('nope')).toBeNull();
    expect(relativeLuminance('#FFF')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#00674F', '#FAFAFA')).toBeCloseTo(
      contrastRatio('#FAFAFA', '#00674F')!,
      10,
    );
  });

  it('supports 6-digit hex without the leading hash', () => {
    expect(contrastRatio('000000', 'FFFFFF')).toBeCloseTo(21, 1);
  });

  it('returns null when either color is invalid', () => {
    expect(contrastRatio('nope', '#FFFFFF')).toBeNull();
    expect(contrastRatio('#FFFFFF', '#12345')).toBeNull();
  });
});
