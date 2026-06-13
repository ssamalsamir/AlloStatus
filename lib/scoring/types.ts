// Shared shapes for the scoring engine. Everything here is plain data — no I/O,
// no framework types — so the same definitions work on the server, in the
// browser (for the live what-if sliders), and in tests.

export type FactorKey =
  | "hrv"
  | "sleepConsistency"
  | "restingHr"
  | "exercise"
  | "diet"
  | "social";

export type FactorSource = "wearable" | "self" | "either";

/** One day of raw inputs, before any featurization. Nulls are normal — most
 *  people won't have every signal every day. */
export interface DailyRecord {
  date: string; // yyyy-mm-dd
  hrvRmssdMs: number | null;
  sleepHours: number | null;
  sleepMidpointHours: number | null; // decimal hours, 0–24 (e.g. 3.5 = 03:30)
  restingHrBpm: number | null;
  dietQuality: number | null; // 1–5
  socialSupport: number | null; // 1–5
  exerciseMin: number | null;
}

/** The six scalars the model actually reasons about for a single day.
 *  `sleepConsistency` is derived (see featurize.ts); the rest map straight
 *  across from a DailyRecord. */
export type FactorInputs = Record<FactorKey, number | null>;

export interface Baseline {
  mean: number;
  sd: number;
  samples: number;
  source: "personal" | "population";
  /** The most favourable raw value on record, used as the "your best self"
   *  reference for depletion ranking. Direction-aware: a max for factors where
   *  higher is better, a min for the ones where lower is better. */
  best: number;
}

export type Baselines = Record<FactorKey, Baseline>;

export interface FactorScore {
  key: FactorKey;
  label: string;
  value: number | null; // today's featurized value
  /** Direction-corrected, clamped z-score. Positive means today beat your own
   *  norm for this factor; negative means it dragged. */
  goodnessZ: number;
  weight: number; // the weight actually applied today (renormalized over present factors)
  contribution: number; // weight × goodnessZ
  present: boolean;
}

export interface Depletor {
  key: FactorKey;
  label: string;
  /** Weighted distance between your best day and today for this factor —
   *  the thing we sort the ranking by. */
  amount: number;
  goodnessZ: number;
  severity: "mild" | "moderate" | "high";
  nudge: string;
}

export interface DayAnalysis {
  date: string;
  bufferPct: number; // 0–100
  factors: FactorScore[];
  depletors: Depletor[];
  coverage: { present: number; total: number };
}

export interface Analysis {
  today: DayAnalysis;
  trend: { date: string; bufferPct: number }[];
  best30: { date: string; bufferPct: number } | null;
  /** Today's baselines and inputs, handed to the client so the lifestyle
   *  sliders can recompute the score in real time with the exact same math. */
  baselines: Baselines;
  inputsToday: FactorInputs;
}
