import type { Baselines, Depletor, FactorScore } from "./types";
import { factor } from "./weights";
import { clamp } from "./stats";
import { nudgeFor } from "./nudges";

const Z_CLAMP = 3;
// Ignore gaps small enough to be noise — we'd rather surface two real things
// than pad the list out to three.
const MIN_AMOUNT = 0.02;

/**
 * Rank the factors that are pulling the buffer down *right now*.
 *
 * For each factor we ask: how far is today below your best day on record, in
 * weighted terms? That's `weight × (best_z − today_z)`, floored at zero so a
 * factor you're nailing never shows up as a problem. The biggest gaps win,
 * because closing them is where the buffer has the most to gain.
 */
export function rankDepletors(
  factors: FactorScore[],
  baselines: Baselines,
  limit = 3,
): Depletor[] {
  const ranked: Depletor[] = [];

  for (const fs of factors) {
    if (!fs.present || fs.value == null) continue;

    const f = factor(fs.key);
    const b = baselines[fs.key];
    const bestZ = clamp(((b.best - b.mean) / b.sd) * f.direction, -Z_CLAMP, Z_CLAMP);
    const gap = Math.max(0, bestZ - fs.goodnessZ);
    const amount = fs.weight * gap;
    if (amount < MIN_AMOUNT) continue;

    const severity =
      fs.goodnessZ <= -1.25 ? "high" : fs.goodnessZ <= -0.4 ? "moderate" : "mild";

    ranked.push({
      key: fs.key,
      label: fs.label,
      amount,
      goodnessZ: fs.goodnessZ,
      severity,
      nudge: nudgeFor(fs.key, {
        goodnessZ: fs.goodnessZ,
        value: fs.value,
        baseline: b,
      }),
    });
  }

  return ranked.sort((a, b) => b.amount - a.amount).slice(0, limit);
}
