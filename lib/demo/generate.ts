import type { DailyRecord } from "../scoring/types";
import { clamp, round } from "../scoring/stats";

// Deterministic synthetic history for "someone who's worn a tracker for two
// months." Same persona in, same history out, so server renders are stable and
// the seed script and live demo agree.
//
// Because the score is relative to your *own* rolling baseline, the interesting
// stories come from the `arc`: a recent stretch where one or more factors pull
// away from the personal norm. A decline tanks the buffer and lights up the
// depletion ranking; a rebound lifts it; a sleep-only arc isolates one factor.

export interface ArcConfig {
  /** How many recent days the arc spans. Deltas ramp in over the window and hit
   *  full strength today. Signs are "more of this": +hrv lifts HRV, +sleepWander
   *  makes bedtime messier, −exercise means moving less. */
  days: number;
  hrv?: number;
  restingHr?: number;
  sleepHours?: number;
  sleepWander?: number;
  exercise?: number;
  diet?: number;
  social?: number;
}

export interface PersonaConfig {
  seed: number;
  hrvBase: number; // ms RMSSD
  restingHrBase: number; // bpm
  sleepHoursBase: number;
  sleepMidBase: number; // decimal hours (3.4 = 03:24)
  sleepWander: number; // baseline SD of the sleep midpoint, in hours
  exerciseScale: number; // multiplier on the weekly exercise cadence
  dietBase: number; // 1–5
  socialBase: number; // 1–5
  arc?: ArcConfig;
}

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

// Minutes of exercise by weekday (Sun…Sat) — a believable cadence: harder days
// midweek and on the weekend, lighter (but rarely zero) days between. Keeping a
// floor means the factor isn't so volatile that a real drop in activity gets
// lost in the week-to-week swing.
const EXERCISE_BY_DOW = [20, 12, 38, 15, 32, 12, 44];

export function generateHistory(persona: PersonaConfig, days = 60): DailyRecord[] {
  const rng = mulberry32(persona.seed);
  const gauss = (mean: number, sd: number): number => {
    const u1 = Math.max(rng(), 1e-9);
    const u2 = rng();
    return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sd;
  };

  const arc = persona.arc;
  const today = midnightUtcToday();
  const records: DailyRecord[] = [];

  for (let i = 0; i < days; i++) {
    const date = isoDaysBefore(today, days - 1 - i); // oldest → today
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();

    // 0 for most of the window, ramping to 1 across the arc's final stretch.
    const into = arc ? i - (days - arc.days) : -1;
    const t = arc && into > 0 ? clamp(into / (arc.days - 1), 0, 1) : 0;
    const weekly = Math.sin((i / 7) * 2 * Math.PI); // gentle weekly rhythm

    const hrv = clamp(gauss(persona.hrvBase + weekly * 3, 2.8) + t * (arc?.hrv ?? 0), 18, 95);
    const restingHr = clamp(
      gauss(persona.restingHrBase - weekly * 1.5, 2) +
        t * (arc?.restingHr ?? 0) +
        (persona.hrvBase - hrv) * 0.05,
      44,
      85,
    );
    const sleepHours = clamp(
      gauss(persona.sleepHoursBase, 0.4) + t * (arc?.sleepHours ?? 0),
      4.5,
      9.5,
    );
    // Under a sleep arc the midpoint drifts later *and* noisier — that combo is
    // what moves the sleep-consistency factor.
    const wander = Math.max(0.12, persona.sleepWander + t * (arc?.sleepWander ?? 0));
    const sleepMidpoint = clamp(
      gauss(persona.sleepMidBase + (arc?.sleepWander ? t * 0.6 : 0), wander),
      0.5,
      7,
    );
    const exercise = Math.max(
      0,
      Math.round(gauss(EXERCISE_BY_DOW[dow] * persona.exerciseScale, 6) + t * (arc?.exercise ?? 0)),
    );
    const diet = Math.round(clamp(gauss(persona.dietBase, 0.42) + t * (arc?.diet ?? 0), 1, 5));
    const social = Math.round(
      clamp(gauss(persona.socialBase, 0.42) + t * (arc?.social ?? 0), 1, 5),
    );

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
