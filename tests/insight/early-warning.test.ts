import { describe, expect, it } from "vitest";
import type { DailyRecord } from "../../lib/scoring/types";
import { analyze } from "../../lib/scoring";
import { detectEarlyWarning } from "../../lib/insight/early-warning";

// These run the real scoring pipeline (analyze) end-to-end and then read the
// early-warning light off it, so they exercise the actual integration rather
// than a hand-built Analysis.

function day(i: number): string {
  const d = new Date(Date.UTC(2026, 0, 1));
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
}

// A healthy day, comfortably above the population reference on every factor.
function healthy(i: number, o: Partial<DailyRecord> = {}): DailyRecord {
  return {
    date: day(i),
    hrvRmssdMs: 50,
    sleepHours: 7.4,
    sleepMidpointHours: 3.4,
    restingHrBpm: 58,
    exerciseMin: 35,
    dietQuality: 4,
    socialSupport: 4,
    ...o,
  };
}

describe("detectEarlyWarning", () => {
  it("stays steady (light off) when the buffer holds at baseline", () => {
    // Mild day-to-day wobble, no trend — a quiet month.
    const records = Array.from({ length: 30 }, (_, i) =>
      healthy(i, {
        hrvRmssdMs: 50 + ((i % 3) - 1) * 2,
        restingHrBpm: 58 + ((i % 3) - 1),
        exerciseMin: 35 + ((i % 4) - 1.5) * 4,
        dietQuality: 4 + (i % 2),
        socialSupport: 4 + ((i + 1) % 2),
      }),
    );

    const w = detectEarlyWarning(analyze(records));

    expect(w.level).toBe("steady");
    expect(w.signals).toHaveLength(0);
    expect(w.daysToFloor).toBeNull();
  });

  it("lights up a warning when several systems slide together over a week", () => {
    const records = Array.from({ length: 30 }, (_, i) => {
      if (i < 22) return healthy(i);
      const t = (i - 21) / 8; // 0 → 1 across the final stretch
      return healthy(i, {
        hrvRmssdMs: 50 - 26 * t,
        sleepMidpointHours: 3.4 + 3 * t, // bedtime swinging later
        restingHrBpm: 58 + 12 * t,
        exerciseMin: 35 - 32 * t,
        dietQuality: 4 - 2.5 * t,
        socialSupport: 4 - 2.5 * t,
      });
    });

    const w = detectEarlyWarning(analyze(records));

    expect(w.level).toBe("warning");
    expect(w.decliningSystems.length).toBeGreaterThanOrEqual(3);
    expect(w.signals.some((s) => s.key === "decline" || s.key === "slope")).toBe(true);
  });

  it("reports calibrating when there isn't yet a week of history", () => {
    const records = Array.from({ length: 4 }, (_, i) => healthy(i));

    const w = detectEarlyWarning(analyze(records));

    expect(w.calibrating).toBe(true);
    expect(w.basisDays).toBeLessThan(7);
    expect(w.level).toBe("steady"); // never alarm on thin data
  });
});
