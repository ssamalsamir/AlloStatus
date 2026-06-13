import { clamp } from "./scoring/stats";
import type { Depletor } from "./scoring/types";

// Resilience reads as a traffic light, keyed to the score itself: a clear red
// when the buffer is low, amber through the medium band, forest green when it's
// good. One scale drives the dial, the big number, the trend marker *and* the
// check-engine light, so a glance at any of them tells the same story. The cut
// points line up with scoreLabel's boundaries, so the colour and the word never
// disagree — you'll never see "Strong" in red or "Low" in green.
const LOW_MAX = 45; // below this the buffer is low      → red
const GOOD_MIN = 60; // at or above this it's good        → green
// [LOW_MAX, GOOD_MIN) is the medium band                → yellow

export type ScoreBand = "low" | "medium" | "good";

/** Which traffic-light band a 0–100 buffer score falls in. */
export function scoreBand(pct: number): ScoreBand {
  const p = clamp(pct, 0, 100);
  if (p < LOW_MAX) return "low";
  if (p < GOOD_MIN) return "medium";
  return "good";
}

// Hue is locked per band, so the colour always reads unambiguously red / yellow
// / green; only lightness eases a little within each band, so the ring still
// feels alive as the score moves without ever drifting out of its colour family.
export function scoreColor(pct: number): string {
  const p = clamp(pct, 0, 100);
  switch (scoreBand(p)) {
    case "low": {
      const t = p / LOW_MAX; // 0 → 1 across the red band
      return `hsl(4 75% ${Math.round(56 - t * 8)}%)`; // 56% → 48%
    }
    case "medium": {
      const t = (p - LOW_MAX) / (GOOD_MIN - LOW_MAX); // 0 → 1 across yellow
      return `hsl(42 90% ${Math.round(50 - t * 4)}%)`; // 50% → 46%
    }
    default: {
      const t = (p - GOOD_MIN) / (100 - GOOD_MIN); // 0 → 1 across green
      return `hsl(150 46% ${Math.round(44 - t * 10)}%)`; // 44% → 34%
    }
  }
}

export function scoreLabel(pct: number): string {
  if (pct < 25) return "Depleted";
  if (pct < 45) return "Low";
  if (pct < 60) return "Steady";
  if (pct < 78) return "Strong";
  return "Peak";
}

// Urgency, dialed down to the warm palette: clay → terracotta → sand rather
// than alarm-red, so the ranking reads as gentle guidance, not a warning light.
export function severityColor(severity: Depletor["severity"]): string {
  switch (severity) {
    case "high":
      return "hsl(12 52% 54%)";
    case "moderate":
      return "hsl(26 48% 56%)";
    default:
      return "hsl(38 42% 62%)";
  }
}

// Positive / negative tints for the per-factor bars — sage green when a factor
// is helping today, soft clay when it's dragging. The green/clay split keeps
// the diverging bars readable on cream and on-palette.
export const POS = "hsl(150 30% 42%)";
export const NEG = "hsl(12 50% 56%)";
