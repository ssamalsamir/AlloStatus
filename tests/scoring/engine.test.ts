import { describe, expect, it } from "vitest";
import type { DailyRecord } from "../../lib/scoring/types";
import { featurize } from "../../lib/scoring/featurize";
import { baselinesFrom } from "../../lib/scoring/baseline";
import { scoreFactors, bufferFromFactors } from "../../lib/scoring/score";
import { rankDepletors } from "../../lib/scoring/depletion";
import { analyze } from "../../lib/scoring";
import { FACTORS } from "../../lib/scoring/weights";

// A day where every factor sits exactly on its population reference.
function averageRecord(date: string, overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    date,
    hrvRmssdMs: 42,
    sleepHours: 7.2,
    sleepMidpointHours: 3.5,
    restingHrBpm: 62,
    exerciseMin: 24,
    dietQuality: 6,
    socialSupport: 6.6,
    ...overrides,
  };
}

function day(i: number): string {
  const d = new Date(Date.UTC(2026, 0, 1));
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
}

function inputsOf(records: DailyRecord[]) {
  return featurize(records).map((f) => f.inputs);
}

describe("featurize", () => {
  it("maps raw signals straight across and derives sleep consistency", () => {
    const records = [day(0), day(1), day(2)].map((d) =>
      averageRecord(d, { sleepMidpointHours: 3.5 }),
    );
    const features = featurize(records);

    expect(features[0].inputs.hrv).toBe(42);
    // One night isn't a pattern, so the first day can't have a consistency value.
    expect(features[0].inputs.sleepConsistency).toBeNull();
    // By day three there are enough nights, and they're identical, so ~0 drift.
    expect(features[2].inputs.sleepConsistency).toBeCloseTo(0, 5);
  });

  it("scores a wandering bedtime as less consistent than a steady one", () => {
    const steady = inputsOf([0, 1, 2, 3].map((i) => averageRecord(day(i), { sleepMidpointHours: 3.5 })));
    const wandering = inputsOf(
      [3.5, 1.0, 5.5, 2.0].map((mid, i) => averageRecord(day(i), { sleepMidpointHours: mid })),
    );

    expect(steady.at(-1)!.sleepConsistency).toBeLessThan(
      wandering.at(-1)!.sleepConsistency!,
    );
  });
});

describe("baselines", () => {
  it("falls back to population ranges until there's a week of data", () => {
    const short = inputsOf([0, 1, 2].map((i) => averageRecord(day(i))));
    const b = baselinesFrom(short);
    expect(b.hrv.source).toBe("population");
    expect(b.hrv.mean).toBe(42);
  });

  it("switches to personal numbers once there's enough history", () => {
    const long = inputsOf(Array.from({ length: 14 }, (_, i) => averageRecord(day(i), { hrvRmssdMs: 70 })));
    const b = baselinesFrom(long);
    expect(b.hrv.source).toBe("personal");
    expect(b.hrv.mean).toBeCloseTo(70, 5);
  });

  it("holds an SD floor so a steady stretch can't explode z-scores", () => {
    const flat = inputsOf(Array.from({ length: 14 }, (_, i) => averageRecord(day(i), { hrvRmssdMs: 50 })));
    const b = baselinesFrom(flat);
    // Raw SD is 0, but the floor is 30% of the population spread (16).
    expect(b.hrv.sd).toBeCloseTo(16 * 0.3, 5);
  });

  it("tracks the best value in the healthy direction", () => {
    const records = inputsOf([
      averageRecord(day(0), { hrvRmssdMs: 40, restingHrBpm: 70 }),
      averageRecord(day(1), { hrvRmssdMs: 80, restingHrBpm: 50 }),
      averageRecord(day(2), { hrvRmssdMs: 55, restingHrBpm: 60 }),
    ]);
    const b = baselinesFrom(records);
    expect(b.hrv.best).toBe(80); // higher HRV is better
    expect(b.restingHr.best).toBe(50); // lower resting HR is better
  });
});

describe("scoring", () => {
  it("an average day lands near 50", () => {
    const inputs = featurize([averageRecord(day(0))])[0].inputs;
    const baselines = baselinesFrom([inputs]); // population fallback, mean == value
    const buffer = bufferFromFactors(scoreFactors(inputs, baselines));
    expect(buffer).toBeCloseTo(50, 0);
  });

  it("respects each factor's direction", () => {
    const base = featurize([averageRecord(day(0))])[0].inputs;
    const baselines = baselinesFrom([base]);

    const goodHrv = scoreFactors({ ...base, hrv: 90 }, baselines);
    const highRhr = scoreFactors({ ...base, restingHr: 90 }, baselines);

    expect(bufferFromFactors(goodHrv)).toBeGreaterThan(50); // more HRV helps
    expect(bufferFromFactors(highRhr)).toBeLessThan(50); // more resting HR hurts
  });

  it("renormalizes weights when factors are missing", () => {
    // Only diet present, one SD above its reference → goodnessZ of +1 at full weight.
    const sparse = {
      hrv: null,
      sleepConsistency: null,
      restingHr: null,
      exercise: null,
      diet: 7.8, // ref mean 6.0, ref sd 1.8 → z ≈ +1
      social: null,
    };
    const baselines = baselinesFrom([sparse]);
    const factors = scoreFactors(sparse, baselines);
    const diet = factors.find((f) => f.key === "diet")!;

    expect(diet.weight).toBeCloseTo(1, 5); // soaks up the whole weight
    expect(bufferFromFactors(factors)).toBeCloseTo(100 * (1 / (1 + Math.exp(-1))), 0);
  });
});

describe("depletion ranking", () => {
  it("surfaces the factor that fell furthest from your best", () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      averageRecord(day(i), { hrvRmssdMs: 60 }),
    );
    // Today: HRV collapses, everything else holds.
    history.push(averageRecord(day(20), { hrvRmssdMs: 22 }));

    const feats = inputsOf(history);
    const baselines = baselinesFrom(feats);
    const factors = scoreFactors(feats.at(-1)!, baselines);
    const depletors = rankDepletors(factors, baselines);

    expect(depletors[0].key).toBe("hrv");
    expect(depletors[0].severity).toBe("high");
    expect(depletors[0].nudge.length).toBeGreaterThan(0);
    expect(depletors.length).toBeLessThanOrEqual(3);
  });

  it("flags nothing when you're at or above your norm everywhere", () => {
    const steady = Array.from({ length: 14 }, (_, i) => averageRecord(day(i)));
    const feats = inputsOf(steady);
    const baselines = baselinesFrom(feats);
    const factors = scoreFactors(feats.at(-1)!, baselines);
    expect(rankDepletors(factors, baselines)).toHaveLength(0);
  });
});

describe("analyze", () => {
  it("returns a coherent picture end to end", () => {
    const records = Array.from({ length: 40 }, (_, i) => averageRecord(day(i)));
    const result = analyze(records);

    expect(result.today.bufferPct).toBeGreaterThan(0);
    expect(result.today.bufferPct).toBeLessThan(100);
    expect(result.trend).toHaveLength(30); // capped at the trend window
    expect(result.best30).not.toBeNull();
    expect(result.today.coverage.total).toBe(FACTORS.length);
    expect(Object.keys(result.baselines)).toHaveLength(FACTORS.length);
  });

  it("degrades gracefully with no data", () => {
    const result = analyze([]);
    expect(result.today.bufferPct).toBe(50);
    expect(result.trend).toHaveLength(0);
    expect(result.best30).toBeNull();
  });
});
