import { factor } from "./scoring/weights";
import type { FactorKey } from "./scoring/types";

// How each factor's raw value reads in the UI. Most are "<number> <unit>", but a
// couple want special treatment: the 1–5 self-reports read as "x/5", and sleep
// consistency is a spread, so we show it as "±x h".
export function formatFactorValue(key: FactorKey, value: number | null): string {
  if (value == null) return "—";
  const f = factor(key);

  switch (key) {
    case "sleepConsistency":
      return `±${value.toFixed(1)} h`;
    case "diet":
    case "social":
      return `${Math.round(value)}/5`;
    default:
      return `${Math.round(value)} ${f.unit}`;
  }
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
