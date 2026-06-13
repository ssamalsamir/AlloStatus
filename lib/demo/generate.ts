import type { DailyRecord } from "../scoring/types";
import { clamp, round } from "../scoring/stats";

// A deterministic stand-in for "someone who's been wearing a tracker for two
// months." Same seed in, same history out, so server renders are stable and the
// seed script and the live demo agree. The story baked in: a solid baseline,
// then a rough patch over the last ~10 days where sleep timing slips, HRV
// sags, and social contact thins out — exactly the kind of thing the depletion
// ranking exists to catch.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function midnightUtcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isoDaysBefore(base: Date, n: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const ROUGH_PATCH = 10; // the recent days that have been going sideways

// Minutes of exercise by weekday (Sun…Sat) — a believable cadence with a couple
// of rest days rather than something robotically even.
const EXERCISE_BY_DOW = [25, 0, 40, 0, 35, 0, 50];

export function generateHistory(days = 60, seed = 7): DailyRecord[] {
  const rng = mulberry32(seed);
  const gauss = (mean: number, sd: number): number => {
    const u1 = Math.max(rng(), 1e-9);
    const u2 = rng();
    return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sd;
  };

  const today = midnightUtcToday();
  const records: DailyRecord[] = [];

  for (let i = 0; i < days; i++) {
    const date = isoDaysBefore(today, days - 1 - i); // oldest → today
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();

    // 0 for most of the window, ramping to ~1 over the final stretch.
    const intoRough = i - (days - ROUGH_PATCH);
    const strain = intoRough > 0 ? clamp(intoRough / (ROUGH_PATCH - 1), 0, 1) : 0;
    const weekly = Math.sin((i / 7) * 2 * Math.PI); // gentle weekly rhythm

    const hrv = clamp(gauss(48 + weekly * 3, 5) - strain * 14, 18, 95);
    const restingHr = clamp(
      gauss(57 - weekly * 1.5, 2.5) + strain * 7 + (48 - hrv) * 0.05,
      44,
      85,
    );
    const sleepHours = clamp(gauss(7.3, 0.5) - strain * 0.6, 4.5, 9.5);
    // The midpoint drifts later *and* gets noisier under strain — that combo is
    // what tanks the sleep-consistency factor.
    const sleepMidpoint = clamp(gauss(3.4 + strain * 0.9, 0.3 + strain * 1.0), 0.5, 7);
    const exercise = Math.max(
      0,
      Math.round(gauss(EXERCISE_BY_DOW[dow], 8) - strain * 10),
    );
    const diet = Math.round(clamp(gauss(3.7 - strain * 0.8, 0.55), 1, 5));
    const social = Math.round(clamp(gauss(3.7 - strain * 1.3, 0.55), 1, 5));

    records.push({
      date,
      hrvRmssdMs: round(hrv, 1),
      sleepHours: round(sleepHours, 1),
      sleepMidpointHours: round(sleepMidpoint, 2),
      restingHrBpm: round(restingHr, 1),
      exerciseMin: exercise,
      dietQuality: diet,
      socialSupport: social,
    });
  }

  return records;
}
