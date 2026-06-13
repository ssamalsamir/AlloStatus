import { clamp } from "./scoring/stats";
import type { Depletor } from "./scoring/types";

// The buffer has one accent colour that slides from a warm red when you're
// depleted to green when you're strong. Keeping it on a continuous hue (rather
// than three hard-coded buckets) means the ring shifts smoothly as the number
// moves, which reads as calmer.
export function scoreHue(pct: number): number {
  const t = clamp(pct, 0, 100) / 100;
  return 8 + t * (152 - 8); // 8° ≈ deep orange, 152° ≈ green
}

export function scoreColor(pct: number, sat = 64, light = 46): string {
  return `hsl(${Math.round(scoreHue(pct))} ${sat}% ${light}%)`;
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

// Positive / negative tints for the per-factor bars — green when a factor is
// helping today, red when it's dragging, muted when there's no reading.
export const POS = "hsl(150 52% 43%)";
export const NEG = "hsl(8 64% 53%)";
