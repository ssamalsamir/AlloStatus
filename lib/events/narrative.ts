import { formatDate } from "../format";
import { eventLabel } from "./categories";
import type { TrendEvent } from "./types";

/** Events that fall within the trend window, oldest first. */
export function eventsInTrend(events: TrendEvent[], trendDates: string[]): TrendEvent[] {
  const window = new Set(trendDates);
  return events.filter((e) => window.has(e.date)).sort((a, b) => a.date.localeCompare(b.date));
}

/** Plain-language summary for the chart and chat context. */
export function buildTrendNarrative(
  trend: { date: string; bufferPct: number }[],
  events: TrendEvent[],
): string | null {
  const tagged = eventsInTrend(events, trend.map((p) => p.date));
  if (tagged.length === 0) return null;

  const byDate = new Map<string, TrendEvent[]>();
  for (const e of tagged) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const parts: string[] = [];
  for (const [date, dayEvents] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const point = trend.find((p) => p.date === date);
    const labels = dayEvents.map((e) => eventLabel(e).toLowerCase());
    const when = formatDate(date);
    const score = point ? ` (buffer ${Math.round(point.bufferPct)})` : "";
    parts.push(`${when}: ${labels.join(", ")}${score}`);
  }

  return parts.join("; ");
}

/** Find tagged events near the steepest recent drop — used by early warning. */
export function eventsNearDecline(
  trend: { date: string; bufferPct: number }[],
  events: TrendEvent[],
  windowDays = 7,
): TrendEvent[] {
  if (trend.length < windowDays) return [];

  const recent = trend.slice(-windowDays);
  let worstIdx = 0;
  let worstDrop = 0;
  for (let i = 1; i < recent.length; i++) {
    const drop = recent[i - 1].bufferPct - recent[i].bufferPct;
    if (drop > worstDrop) {
      worstDrop = drop;
      worstIdx = i;
    }
  }
  if (worstDrop < 4) return [];

  const anchor = recent[worstIdx].date;
  const anchorMs = Date.parse(`${anchor}T00:00:00Z`);
  const spanMs = 2 * 86400000; // ±2 days

  return events.filter((e) => {
    const ms = Date.parse(`${e.date}T00:00:00Z`);
    return Math.abs(ms - anchorMs) <= spanMs;
  });
}
