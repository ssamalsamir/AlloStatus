import type { Baseline, FactorKey } from "./types";

export interface NudgeContext {
  goodnessZ: number; // how far below (or above) your norm today
  value: number; // today's raw featurized value
  baseline: Baseline;
}

// Below this, a factor is far enough under someone's own baseline to warrant the
// firmer wording. It's the same line we use for "high" severity, so the tone of
// the nudge always matches the severity dot next to it.
const FIRM = -1.25;

// One nudge per factor, in two registers. Each references *your* norm and a
// concrete number where it helps, and is meant to be doable today rather than a
// lecture. The firmer line only shows when the factor is well below baseline.
const NUDGES: Record<FactorKey, (c: NudgeContext) => string> = {
  hrv: ({ goodnessZ }) =>
    goodnessZ <= FIRM
      ? "HRV is well under your usual range — a classic sign of accumulated strain. Treat today as recovery: easy movement, an earlier night, go gentle on caffeine and alcohol."
      : "HRV is dipping below your norm. Protect tonight's sleep and keep training on the lighter side until it recovers.",

  sleepConsistency: ({ goodnessZ, value }) =>
    goodnessZ <= FIRM
      ? `Your sleep timing has been swinging by about ${value.toFixed(1)}h over the past week — more than your body settles well with. Anchor one wake-up time (within ~30 min, weekends included) and let bedtime follow.`
      : "Your bedtime has been drifting from its usual rhythm. A steadier wake-up time over the next few days will pull it back.",

  restingHr: ({ goodnessZ }) =>
    goodnessZ <= FIRM
      ? "Resting heart rate is running high for you, which often trails poor sleep, dehydration, or a coming illness. Hydrate, ease off intensity, and check in again tomorrow."
      : "Resting heart rate is a touch above your baseline. Worth a calm day and some extra water.",

  exercise: ({ goodnessZ, value }) =>
    goodnessZ <= FIRM
      ? `Barely any movement lately (~${Math.round(value)} min/day). Even a brisk 15-minute walk counts — it's one of the most reliable ways to rebuild this buffer.`
      : "Activity is below your usual. A short walk or an easy session today would nudge it back up.",

  diet: ({ goodnessZ }) =>
    goodnessZ <= FIRM
      ? "Diet has dropped well below your norm. No overhaul needed — one genuinely good meal and steady hydration today is enough to move it."
      : "Diet has slipped a little from your norm. An easy win to reclaim today.",

  social: ({ goodnessZ }) =>
    goodnessZ <= FIRM
      ? "Connection has been thin lately, and it quietly buffers a lot of stress. Reach out to one person you trust today — a short call counts more than you'd think."
      : "A bit less connection than usual. A quick message to someone you trust helps more than it seems.",
};

export function nudgeFor(key: FactorKey, ctx: NudgeContext): string {
  return NUDGES[key](ctx);
}
