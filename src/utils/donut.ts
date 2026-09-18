export interface DonutSegmentSpec {
  key: string;
  percentage: number;
}

export function polarPoint(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function segmentAngles(
  segments: DonutSegmentSpec[],
): { key: string; start: number; end: number }[] {
  let cursor = 0;
  return segments.map((segment) => {
    const start = cursor;
    cursor += (segment.percentage / 100) * 360;
    return { key: segment.key, start, end: cursor };
  });
}

export function sectorPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const end = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
  const outerStart = polarPoint(cx, cy, outerR, startAngle);
  const outerEnd = polarPoint(cx, cy, outerR, end);
  const innerEnd = polarPoint(cx, cy, innerR, end);
  const innerStart = polarPoint(cx, cy, innerR, startAngle);
  const largeArc = end - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}
