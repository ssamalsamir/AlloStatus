import { clamp } from "./scoring/stats";
import type { Depletor } from "./scoring/types";
import type { WarningLevel } from "./insight/early-warning";

// On-brand green ramp for the buffer ring and trend: a soft, pale sage when
// you're depleted, deepening through to a rich forest green as you get stronger.
// Hue stays in the green family; saturation and depth carry the level, so it
// always reads as "green" while a fuller, richer ring signals a better day —
// the calm, healthy end of Sonia Health's warm palette.
export function scoreColor(pct: number): string {
  const t = clamp(pct, 0, 100) / 100;
  const hue = 142 + t * 18; // 142 (sage) → 160 (forest)
  const sat = 18 + t * 24; // 18% (muted) → 42% (saturated)
  const light = 66 - t * 32; // 66% (pale) → 34% (deep forest)
  return `hsl(${Math.round(hue)} ${Math.round(sat)}% ${Math.round(light)}%)`;
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

// The check-engine light's three states, on the warm palette: a calm forest
// green when steady, warm sand when worth watching, clay when the warning is on.
// Deliberately not a hard traffic-light red — it should read as a caring nudge,
// not an alarm.
export function warningColor(level: WarningLevel): string {
  switch (level) {
    case "warning":
      return "hsl(12 54% 53%)";
    case "watch":
      return "hsl(36 56% 56%)";
    default:
      return "hsl(155 32% 38%)";
  }
}

// Positive / negative tints for the per-factor bars — sage green when a factor
// is helping today, soft clay when it's dragging. The green/clay split keeps
// the diverging bars readable on cream and on-palette.
export const POS = "hsl(150 30% 42%)";
export const NEG = "hsl(12 50% 56%)";
