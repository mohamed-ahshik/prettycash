export interface DonutSegmentSpec {
  key: string;
  percentage: number;
}

export function donutHit(
  x: number,
  y: number,
  center: number,
  inner: number,
  outer: number,
  segments: DonutSegmentSpec[],
): 'center' | string | null {
  const dx = x - center;
  const dy = y - center;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= inner) return 'center';
  if (distance > outer) return null;
  const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
  let accumulated = 0;
  for (const segment of segments) {
    accumulated += (segment.percentage / 100) * 360;
    if (angle < accumulated) return segment.key;
  }
  return segments.length ? segments[segments.length - 1].key : null;
}
