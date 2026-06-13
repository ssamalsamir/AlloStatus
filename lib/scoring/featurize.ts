import type { DailyRecord, FactorInputs } from "./types";
import { circularStdHours } from "./stats";

// How many nights we look back over to judge sleep-timing stability, and the
// fewest we'll accept before calling it (one or two nights isn't a pattern).
const SLEEP_WINDOW = 7;
const MIN_SLEEP_NIGHTS = 3;

export interface DayFeatures {
  date: string;
  inputs: FactorInputs;
}

/**
 * Turn raw daily records into the six scalars the model scores.
 *
 * Five of them are a direct read-across. The sixth — sleep consistency — isn't
 * a property of a single night, so we derive it here: the circular spread of
 * the sleep midpoint over the trailing week. A steady sleeper scores near zero;
 * someone whose bedtime wanders scores higher (and, because the factor's
 * direction is negative, worse).
 *
 * Records are sorted by date first so the trailing window is well-defined.
 */
export function featurize(records: DailyRecord[]): DayFeatures[] {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((rec, i) => {
    const window = sorted.slice(Math.max(0, i - (SLEEP_WINDOW - 1)), i + 1);
    const midpoints = window
      .map((r) => r.sleepMidpointHours)
      .filter((h): h is number => h != null);

    const sleepConsistency =
      midpoints.length >= MIN_SLEEP_NIGHTS ? circularStdHours(midpoints) : null;

    return {
      date: rec.date,
      inputs: {
        hrv: rec.hrvRmssdMs,
        sleepConsistency,
        restingHr: rec.restingHrBpm,
        exercise: rec.exerciseMin,
        diet: rec.dietQuality,
        social: rec.socialSupport,
      },
    };
  });
}
