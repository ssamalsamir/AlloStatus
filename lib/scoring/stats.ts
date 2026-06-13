// Small numeric helpers. Kept separate so they're trivial to unit-test and so
// the scoring files read like the model spec rather than like arithmetic.

export const clamp = (x: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, x));

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample standard deviation (n−1). Returns 0 for fewer than two points —
 *  the SD floor in baseline.ts is what stops that from blowing up a z-score. */
export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** Spread of a set of clock times, in hours. Times of day wrap around midnight,
 *  so a plain SD would call 23:30 and 00:30 an hour apart when they're really
 *  adjacent. We treat each time as an angle and use the circular SD instead. */
export function circularStdHours(hours: number[]): number {
  if (hours.length < 2) return 0;
  const toRad = (h: number) => (h / 24) * 2 * Math.PI;
  let sin = 0;
  let cos = 0;
  for (const h of hours) {
    sin += Math.sin(toRad(h));
    cos += Math.cos(toRad(h));
  }
  const resultant = Math.sqrt(sin * sin + cos * cos) / hours.length; // 0..1
  if (resultant >= 1) return 0;
  const sdRad = Math.sqrt(-2 * Math.log(resultant));
  return (sdRad / (2 * Math.PI)) * 24;
}

export const round = (x: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};
