import type { Baselines, FactorInputs, FactorScore } from "./types";
import { FACTORS } from "./weights";
import { clamp, sigmoid } from "./stats";

// z-scores are clamped before weighting so one freak reading can't dominate the
// whole buffer — a genuinely awful night should hurt, but not erase everything.
const Z_CLAMP = 3;

/**
 * Score each factor for a single day:
 *
 *   raw value → personal z-score → direction-correct → clamp → weight
 *
 * Weights are renormalized across whatever factors are actually present, so a
 * day with only self-reported inputs still uses the full range of the score
 * instead of being quietly dragged toward the middle by missing wearable data.
 */
export function scoreFactors(
  inputs: FactorInputs,
  baselines: Baselines,
): FactorScore[] {
  const presentWeight =
    FACTORS.filter((f) => inputs[f.key] != null).reduce(
      (sum, f) => sum + f.weight,
      0,
    ) || 1;

  return FACTORS.map((f) => {
    const value = inputs[f.key];
    if (value == null) {
      return {
        key: f.key,
        label: f.label,
        value: null,
        goodnessZ: 0,
        weight: 0,
        contribution: 0,
        present: false,
      };
    }

    const b = baselines[f.key];
    const z = (value - b.mean) / b.sd;
    const goodnessZ = clamp(z * f.direction, -Z_CLAMP, Z_CLAMP);
    const weight = f.weight / presentWeight;

    return {
      key: f.key,
      label: f.label,
      value,
      goodnessZ,
      weight,
      contribution: weight * goodnessZ,
      present: true,
    };
  });
}

/**
 * Collapse the per-factor contributions into a single 0–100 buffer. The sigmoid
 * keeps it smooth and bounded: an average day for you lands near 50, a great one
 * pushes toward the 90s, a rough one toward single digits, with no hard cliffs
 * in between.
 */
export function bufferFromFactors(factors: FactorScore[]): number {
  const weightedSum = factors.reduce((sum, f) => sum + f.contribution, 0);
  return 100 * sigmoid(weightedSum);
}
