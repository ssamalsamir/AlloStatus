import { describe, expect, it } from "vitest";
import { buildTrendNarrative, eventsInTrend, eventsNearDecline } from "../../lib/events/narrative";
import type { TrendEvent } from "../../lib/events/types";

const trend = [
  { date: "2026-01-01", bufferPct: 58 },
  { date: "2026-01-02", bufferPct: 57 },
  { date: "2026-01-03", bufferPct: 56 },
  { date: "2026-01-04", bufferPct: 55 },
  { date: "2026-01-05", bufferPct: 54 },
  { date: "2026-01-06", bufferPct: 52 },
  { date: "2026-01-07", bufferPct: 48 },
  { date: "2026-01-08", bufferPct: 44 },
];

const events: TrendEvent[] = [
  { id: "1", date: "2026-01-07", category: "exam", note: "midterm" },
  { id: "2", date: "2026-01-08", category: "poor_sleep", note: null },
];

describe("events narrative", () => {
  it("filters to trend window", () => {
    const all = [
      ...events,
      { id: "3", date: "2025-12-01", category: "illness" as const, note: null },
    ];
    expect(eventsInTrend(all, trend.map((p) => p.date))).toHaveLength(2);
  });

  it("builds a readable timeline summary", () => {
    const text = buildTrendNarrative(trend, events);
    expect(text).toContain("exam: midterm");
    expect(text).toContain("buffer 48");
  });

  it("finds tags near a recent drop", () => {
    const near = eventsNearDecline(trend, events);
    expect(near.map((e) => e.category)).toContain("exam");
    expect(near.map((e) => e.category)).toContain("poor_sleep");
  });
});
