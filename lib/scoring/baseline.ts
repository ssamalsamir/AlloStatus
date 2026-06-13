import type { Baselines, FactorInputs } from "./types";
import { FACTORS } from "./weights";
import { mean, stdDev } from "./stats";

// "Your normal" is the last 30 days. Below a week of data we don't trust the
// personal numbers yet and lean on population reference ranges instead. The SD
// floor keeps an unusually steady stretch from turning a tiny wobble into a
// dramatic z-score.
const BASELINE_WINDOW = 30;
const MIN_PERSONAL_DAYS = 7;
const SD_FLOOR_RATIO = 0.3;

/**
 * Build per-factor baselines from history *up to and including* the day being
 * scored. Passing only the causal slice (not the full record) is what lets the
 * trend show how each day looked with the knowledge available at the time,
 * rather than re-scoring the past against a future baseline.
 */
export function baselinesFrom(history: FactorInputs[]): Baselines {
  const out = {} as Baselines;

  for (const f of FACTORS) {
    const all = history
      .map((h) => h[f.key])
      .filter((v): v is number => v != null);
    const recent = all.slice(-BASELINE_WINDOW);

    // "Best self" reference for depletion: the most favourable value on record,
    // which way that points depending on the factor's direction.
    const best = all.length
      ? f.direction === 1
        ? Math.max(...all)
        : Math.min(...all)
      : f.ref.mean;

    if (recent.length >= MIN_PERSONAL_DAYS) {
      out[f.key] = {
        mean: mean(recent),
        sd: Math.max(stdDev(recent), f.ref.sd * SD_FLOOR_RATIO),
        samples: recent.length,
        source: "personal",
        best,
      };
    } else {
      out[f.key] = {
        mean: f.ref.mean,
        sd: f.ref.sd,
        samples: recent.length,
        source: "population",
        best,
      };
    }
  }

  return out;
}
