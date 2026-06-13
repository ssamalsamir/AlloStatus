import { clamp } from "./scoring/stats";
import type { Depletor } from "./scoring/types";

// On-brand blue ramp for the buffer ring and trend: a soft, pale steel-blue when
// you're depleted, deepening to a vivid blue as you get stronger. Hue stays put;
// saturation and depth carry the level, so it always reads as "blue" while a
// fuller, richer ring still signals a better day.
export function scoreColor(pct: number): string {
  const t = clamp(pct, 0, 100) / 100;
  const sat = 46 + t * 44; // 46% → 90%
  const light = 63 - t * 16; // 63% (pale) → 47% (deep)
  return `hsl(221 ${Math.round(sat)}% ${Math.round(light)}%)`;
}

export function scoreLabel(pct: number): string {
  if (pct < 25) return "Depleted";
  if (pct < 45) return "Low";
  if (pct < 60) return "Steady";
  if (pct < 78) return "Strong";
  return "Peak";
}

export function severityColor(severity: Depletor["severity"]): string {
  switch (severity) {
    case "high":
      return "hsl(8 72% 52%)";
    case "moderate":
      return "hsl(32 88% 50%)";
    default:
      return "hsl(46 82% 52%)";
  }
}

// Positive / negative tints for the per-factor bars — brand blue when a factor
// is helping today, warm red when it's dragging. The blue/red split keeps the
// diverging bars readable on white and on-palette.
export const POS = "hsl(217 83% 53%)";
export const NEG = "hsl(8 70% 54%)";
