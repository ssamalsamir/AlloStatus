import type { TrendEvent } from "./types";

const PREFIX = "allostatus-trend-events";

export function demoStorageKey(seed: number | undefined): string {
  return `${PREFIX}-${seed ?? 100}`;
}

export function loadDemoEvents(seed: number | undefined): TrendEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(demoStorageKey(seed));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTrendEvent);
  } catch {
    return [];
  }
}

export function saveDemoEvents(seed: number | undefined, events: TrendEvent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(demoStorageKey(seed), JSON.stringify(events));
}

function isTrendEvent(v: unknown): v is TrendEvent {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as TrendEvent).id === "string" &&
    typeof (v as TrendEvent).date === "string" &&
    typeof (v as TrendEvent).category === "string"
  );
}
