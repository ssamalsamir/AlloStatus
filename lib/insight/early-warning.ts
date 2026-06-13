import type { Analysis } from "../scoring";
import { clamp, mean, stdDev } from "../scoring/stats";

// The "check-engine light": an early-warning read that looks at the *trajectory*
// of the resilience buffer rather than today's number alone. The whole point of
// the allostatic-load framing is that strain accumulates quietly — a system run
// at 100% indefinitely breaks — so the signal worth catching is the slide, not
// the snapshot. This module turns the trend + today's factor breakdown into a
// plain-language status (steady / watch / warning) with the specific reasons it
// lit up. It's pure data in, pure data out: no I/O, fully unit-testable.

export type WarningLevel = "steady" | "watch" | "warning";

export interface WarningSignal {
  key: string;
  label: string;
  detail: string;
}

export interface EarlyWarning {
  level: WarningLevel;
  headline: string;
  summary: string;
  /** The specific patterns that fired, each with a number behind it. */
  signals: WarningSignal[];
  /** Systems currently below the person's own norm, worst first. */
  decliningSystems: string[];
  /** Honest, hedged predictive-maintenance estimate: days until the buffer
   *  reaches the person's low-resilience line if the current slide continues.
   *  null unless the trend is genuinely falling. */
  daysToFloor: number | null;
  /** Days of history this read is based on. */
  basisDays: number;
  /** True when there isn't yet enough history to judge a trajectory. */
  calibrating: boolean;
}

// A week is the shortest window that can tell a trend from a bad day.
const MIN_DAYS = 7;
const WINDOW = 7;

// Thresholds, kept together so the model is easy to audit and tune. Each is in
// buffer points (0–100) except the z-score cutoffs, which are in personal SDs.
const SUSTAINED_DROP = 5; // week-over-week fall that counts as a real decline
const STEEP_SLOPE = 1.2; // points/day downslope that counts as "falling fast"
const BELOW_NORM_Z = -0.5; // a factor is "below your norm" past this
const FIRMLY_BELOW_Z = -0.75; // counts toward "several systems at once"
const CO_DECLINE_N = 3; // this many firmly-below factors is a pattern
const FLOOR_PCTILE = 0.2; // "a low day for you" = 20th percentile of history
const NEAR_FLOOR_PAD = 4; // within this many points of the floor is "near it"

export function detectEarlyWarning(analysis: Analysis): EarlyWarning {
  const buffers = analysis.trend.map((p) => p.bufferPct);
  const n = buffers.length;
  const today = analysis.today.bufferPct;

  // Which systems are dragging *right now*, worst first — used both to explain a
  // warning and to detect several drifting down together.
  const below = analysis.today.factors
    .filter((f) => f.present && f.goodnessZ < BELOW_NORM_Z)
    .sort((a, b) => a.goodnessZ - b.goodnessZ);
  const decliningSystems = below.map((f) => f.label);
  const coDecline = below.filter((f) => f.goodnessZ <= FIRMLY_BELOW_Z).length;

  if (n < MIN_DAYS) {
    return {
      level: "steady",
      calibrating: true,
      headline: "Calibrating",
      summary: `Still learning your baseline — ${n} of ${MIN_DAYS} days in. The early-warning light needs about a week of history before it can read your trajectory.`,
      signals: [],
      decliningSystems,
      daysToFloor: null,
      basisDays: n,
    };
  }

  const recent = buffers.slice(-WINDOW);
  const prior = buffers.slice(-2 * WINDOW, -WINDOW);
  const delta = mean(recent) - (prior.length ? mean(prior) : mean(recent));
  const slope = slopePerDay(recent);

  // Widening day-to-day swings often precede a slump — instability before the
  // fall — so a recent jump in volatility is itself an early sign.
  const volRecent = stdDev(diffs(recent));
  const volPrior = prior.length > 1 ? stdDev(diffs(prior)) : volRecent;

  const floor = percentile(buffers, FLOOR_PCTILE);

  const signals: WarningSignal[] = [];

  const sustained = delta <= -SUSTAINED_DROP;
  if (sustained) {
    signals.push({
      key: "decline",
      label: "Sustained decline",
      detail: `Your buffer is down about ${Math.round(-delta)} points from the week before.`,
    });
  }

  const steep = slope <= -STEEP_SLOPE;
  if (steep) {
    signals.push({
      key: "slope",
      label: "Falling fast",
      detail: `Trending down roughly ${Math.abs(slope).toFixed(1)} points a day this past week.`,
    });
  }

  const multi = coDecline >= CO_DECLINE_N;
  if (multi) {
    const named = decliningSystems.slice(0, 3).map((l) => l.toLowerCase()).join(", ");
    signals.push({
      key: "multi",
      label: "Several systems at once",
      detail: `${coDecline} factors are below your own norm together — ${named}.`,
    });
  }

  const unstable = volRecent > volPrior * 1.5 && volRecent > 6;
  if (unstable) {
    signals.push({
      key: "instability",
      label: "Rising instability",
      detail: "Your day-to-day swings are widening — strain often gets noisy before it dips.",
    });
  }

  const nearFloor = today <= floor + NEAR_FLOOR_PAD && today < 48;
  if (nearFloor) {
    signals.push({
      key: "floor",
      label: "Near your low line",
      detail: `You're close to your personal low-resilience line (around ${Math.round(floor)}).`,
    });
  }

  // Predictive-maintenance estimate, deliberately hedged: only offered when the
  // slope is reliably negative and the crossing lands in a believable window.
  let daysToFloor: number | null = null;
  if (slope <= -0.4 && today > floor) {
    const d = (today - floor) / -slope;
    if (d >= 1 && d <= 21) daysToFloor = Math.round(d);
  }

  // Level: a warning needs a real downward trajectory *and* corroboration (more
  // than one system, instability, or proximity to the floor), or enough distinct
  // signals that the picture is unambiguous. One signal alone is a "watch".
  const trajectory = sustained || steep;
  const corroborated = multi || nearFloor || unstable;
  let level: WarningLevel;
  if ((trajectory && corroborated) || signals.length >= 3) level = "warning";
  else if (signals.length >= 1) level = "watch";
  else level = "steady";

  return {
    level,
    calibrating: false,
    headline: HEADLINE[level],
    summary: SUMMARY[level],
    signals,
    decliningSystems,
    daysToFloor,
    basisDays: n,
  };
}

const HEADLINE: Record<WarningLevel, string> = {
  steady: "All systems steady",
  watch: "Worth watching",
  warning: "Early warning",
};

const SUMMARY: Record<WarningLevel, string> = {
  steady:
    "You're holding at or above your own baseline across the board. The light's off — keep doing what's working.",
  watch:
    "An early sign is showing. Nothing alarming yet — a small course-correction this week can keep it from compounding.",
  warning:
    "Several signs are pointing the same way: your resilience is trending down and more than one system is involved. This is the check-engine light coming on — a good moment to ease off and lean on support before it builds further.",
};

// --- small numeric helpers (kept local; the scoring stats module covers the
// rest) -------------------------------------------------------------------

/** Least-squares slope of a series against its day index, in units/day. */
function slopePerDay(ys: number[]): number {
  const k = ys.length;
  if (k < 2) return 0;
  const xs = ys.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < k; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/** Day-to-day changes within a window. */
function diffs(ys: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < ys.length; i++) out.push(ys[i] - ys[i - 1]);
  return out;
}

/** Linear-interpolated percentile of a series (p in 0–1). */
function percentile(ys: number[], p: number): number {
  if (ys.length === 0) return 0;
  const sorted = [...ys].sort((a, b) => a - b);
  const idx = clamp(p, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
