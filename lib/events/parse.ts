import { EVENT_CATEGORIES, type TrendEvent } from "./types";

export function parseTrendEvents(raw: unknown): TrendEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is TrendEvent =>
      !!e &&
      typeof e === "object" &&
      typeof (e as TrendEvent).id === "string" &&
      typeof (e as TrendEvent).date === "string" &&
      typeof (e as TrendEvent).category === "string" &&
      EVENT_CATEGORIES.includes((e as TrendEvent).category),
  );
}
