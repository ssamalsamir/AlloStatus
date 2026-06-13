import type { FactorKey, FactorSource } from "./types";

export interface FactorConfig {
  key: FactorKey;
  label: string;
  short: string;
  unit: string;
  /** Base weight in the composite. The six sum to 1. */
  weight: number;
  /** +1 when a higher raw value is healthier, -1 when lower is. */
  direction: 1 | -1;
  source: FactorSource;
  /** Population reference range, used as a fallback until someone has enough
   *  history for us to learn their personal baseline. */
  ref: { mean: number; sd: number };
  /** Where the weight comes from. Surfaced in the UI so the score is auditable
   *  rather than a black box. */
  citation: string;
}

// Weights are anchored to the allostatic-load literature (Seeman, McEwen) and
// deliberately live in one place: the model is the part we expect to tune most,
// so changing it should mean editing this table and nothing else.
export const FACTORS: FactorConfig[] = [
  {
    key: "hrv",
    label: "Heart-rate variability",
    short: "HRV",
    unit: "ms",
    weight: 0.22,
    direction: 1,
    source: "wearable",
    ref: { mean: 42, sd: 16 },
    citation:
      "McEwen, 2007 — autonomic dysregulation is among the strongest single predictors of allostatic load.",
  },
  {
    key: "sleepConsistency",
    label: "Sleep consistency",
    short: "Sleep timing",
    unit: "h",
    weight: 0.2,
    direction: -1, // value is how much your sleep midpoint drifts; less is better
    source: "wearable",
    ref: { mean: 0.9, sd: 0.45 },
    citation:
      "Seeman et al., 2001 — HPA-axis and metabolic risk cluster with irregular sleep timing.",
  },
  {
    key: "restingHr",
    label: "Resting heart rate",
    short: "Resting HR",
    unit: "bpm",
    weight: 0.18,
    direction: -1,
    source: "wearable",
    ref: { mean: 62, sd: 9 },
    citation: "Seeman, 1997 — resting cardiovascular tone in the allostatic-load index.",
  },
  {
    key: "exercise",
    label: "Exercise",
    short: "Exercise",
    unit: "min",
    weight: 0.15,
    direction: 1,
    source: "either",
    ref: { mean: 24, sd: 18 },
    citation:
      "McEwen & Stellar, 1993 — regular activity buffers cortisol and inflammatory load.",
  },
  {
    key: "diet",
    label: "Diet quality",
    short: "Diet",
    unit: "/5",
    weight: 0.15,
    direction: 1,
    source: "self",
    ref: { mean: 3.0, sd: 0.9 },
    citation: "Allostatic-load metabolic cluster — glucose, lipids, adiposity.",
  },
  {
    key: "social",
    label: "Social support",
    short: "Social",
    unit: "/5",
    weight: 0.1,
    direction: 1,
    source: "self",
    ref: { mean: 3.3, sd: 0.95 },
    citation: "Seeman, 1996 — social integration as an HPA-axis buffer.",
  },
];

const byKey = new Map(FACTORS.map((f) => [f.key, f]));

export function factor(key: FactorKey): FactorConfig {
  const f = byKey.get(key);
  if (!f) throw new Error(`Unknown factor: ${key}`);
  return f;
}

export const FACTOR_KEYS = FACTORS.map((f) => f.key);
