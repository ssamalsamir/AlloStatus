import type { DailyRecord } from "../scoring/types";
import { generateHistory, makeRng, type ArcConfig, type PersonaConfig } from "./generate";

// A fresh synthetic person on every seed. We randomize the baseline, then pick a
// recent "story archetype" and randomize within it — so each pull is different
// but still coherent (a believable week, not noise). The seed lives in the URL,
// so a given sample is stable to render and shareable; pulling again just rolls a
// new seed.

const ARCHETYPES = [
  "decline",
  "decline",
  "rebound",
  "rebound",
  "sleep",
  "sedentary",
  "steady",
] as const;

export function randomPersona(seed: number): PersonaConfig {
  const r = makeRng(seed);
  const between = (lo: number, hi: number) => lo + r() * (hi - lo);
  const base = {
    seed,
    hrvBase: between(38, 58),
    restingHrBase: between(52, 66),
    sleepHoursBase: between(6.6, 7.8),
    sleepMidBase: between(2.6, 4.4),
    sleepWander: between(0.35, 0.7),
    exerciseScale: between(0.6, 1.2),
    dietBase: between(3.0, 4.2),
    socialBase: between(3.0, 4.2),
  };

  const archetype = ARCHETYPES[Math.floor(r() * ARCHETYPES.length)];
  const days = Math.round(between(10, 16));
  let arc: ArcConfig | undefined;

  switch (archetype) {
    case "decline":
      arc = {
        days,
        hrv: -between(10, 18),
        restingHr: between(4, 9),
        sleepHours: -between(0.4, 0.9),
        sleepWander: between(0.6, 1.2),
        exercise: -between(8, 16),
        diet: -between(0.6, 1.2),
        social: -between(0.8, 1.6),
      };
      break;
    case "rebound":
      arc = {
        days,
        hrv: between(11, 18),
        restingHr: -between(4, 8),
        sleepHours: between(0.4, 0.8),
        sleepWander: -between(0.2, 0.5),
        exercise: between(12, 22),
        diet: between(0.8, 1.3),
        social: between(0.6, 1.2),
      };
      break;
    case "sleep":
      arc = { days, sleepWander: between(1.4, 2.0), sleepHours: -between(0.2, 0.5) };
      break;
    case "sedentary":
      arc = { days: Math.round(between(14, 18)), exercise: -between(34, 46), diet: -between(1.4, 2.2) };
      break;
    case "steady":
      arc = undefined; // a quiet week — buffer near your norm, little dragging
      break;
  }

  return { ...base, arc };
}

// A first-load sample that actually shows the depletion ranking doing its job
// (a Low day with a clear multi-factor story) rather than a quiet Peak.
const DEFAULT_SEED = 100;

export function recordsForSeed(seed?: number | null): DailyRecord[] {
  return generateHistory(randomPersona(seed ?? DEFAULT_SEED));
}
