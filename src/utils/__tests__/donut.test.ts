import { polarPoint, sectorPath, segmentAngles } from '../donut';

describe('polarPoint', () => {
  it('maps 0° to the top and 90° to the right', () => {
    const top = polarPoint(70, 70, 62, 0);
    expect(top.x).toBeCloseTo(70);
    expect(top.y).toBeCloseTo(8);

    const right = polarPoint(70, 70, 62, 90);
    expect(right.x).toBeCloseTo(132);
    expect(right.y).toBeCloseTo(70);
  });
});

describe('segmentAngles', () => {
  it('accumulates percentages into degrees', () => {
    expect(
      segmentAngles([
        { key: 'a', percentage: 25 },
        { key: 'b', percentage: 75 },
      ]),
    ).toEqual([
      { key: 'a', start: 0, end: 90 },
      { key: 'b', start: 90, end: 360 },
    ]);
  });
});

describe('sectorPath', () => {
  it('returns a closed path', () => {
    const d = sectorPath(70, 70, 54, 70, 0, 90);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain('A 70 70');
  });
});
