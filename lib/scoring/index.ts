import type { Analysis, Baselines, DailyRecord, DayAnalysis } from "./types";
import { featurize } from "./featurize";
import { baselinesFrom } from "./baseline";
import { scoreFactors, bufferFromFactors } from "./score";
import { rankDepletors } from "./depletion";
import { FACTORS } from "./weights";

const TREND_DAYS = 30;

/**
 * The one function the app calls. Give it a person's daily records and it
 * returns everything the dashboard needs: today's buffer and breakdown, the
 * trailing trend, the 30-day best, and today's baselines/inputs so the client
 * can run live what-if calculations without another round trip.
 *
 * Every day is scored against only the history that preceded it, so the trend
 * is an honest record of how each day actually looked at the time.
 */
export function analyze(records: DailyRecord[], trendDays = TREND_DAYS): Analysis {
  const features = featurize(records); // sorted ascending by date

  if (features.length === 0) {
    return { today: emptyDay(), trend: [], best30: null, baselines: emptyBaselines(), inputsToday: emptyInputs() };
  }

  let lastBaselines: Baselines = emptyBaselines();
  const daily: DayAnalysis[] = features.map((day, i) => {
    const history = features.slice(0, i + 1).map((d) => d.inputs);
    const baselines = baselinesFrom(history);
    lastBaselines = baselines;

    const factors = scoreFactors(day.inputs, baselines);
    const present = factors.filter((f) => f.present).length;

    return {
      date: day.date,
      bufferPct: bufferFromFactors(factors),
      factors,
      depletors: rankDepletors(factors, baselines),
      coverage: { present, total: factors.length },
    };
  });

  const today = daily[daily.length - 1];
  const trend = daily.slice(-trendDays).map((d) => ({ date: d.date, bufferPct: d.bufferPct }));
  const best30 = trend.reduce<Analysis["best30"]>(
    (best, p) => (!best || p.bufferPct > best.bufferPct ? p : best),
    null,
  );

  return {
    today,
    trend,
    best30,
    baselines: lastBaselines,
    inputsToday: features[features.length - 1].inputs,
  };
}

function emptyInputs() {
  return Object.fromEntries(FACTORS.map((f) => [f.key, null])) as Analysis["inputsToday"];
}

function emptyBaselines(): Baselines {
  return Object.fromEntries(
    FACTORS.map((f) => [
      f.key,
      { mean: f.ref.mean, sd: f.ref.sd, samples: 0, source: "population" as const, best: f.ref.mean },
    ]),
  ) as Baselines;
}

function emptyDay(): DayAnalysis {
  return {
    date: "",
    bufferPct: 50,
    factors: FACTORS.map((f) => ({
      key: f.key,
      label: f.label,
      value: null,
      goodnessZ: 0,
      weight: 0,
      contribution: 0,
      present: false,
    })),
    depletors: [],
    coverage: { present: 0, total: FACTORS.length },
  };
}

export * from "./types";
export { FACTORS, FACTOR_KEYS, factor } from "./weights";
export { scoreFactors, bufferFromFactors } from "./score";
export { rankDepletors } from "./depletion";
export { baselinesFrom } from "./baseline";
export { featurize } from "./featurize";
export { nudgeFor } from "./nudges";
