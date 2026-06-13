"use client";

import { useMemo, useState } from "react";
import {
  bufferFromFactors,
  rankDepletors,
  scoreFactors,
  type Analysis,
  type FactorInputs,
} from "@/lib/scoring";
import { scoreColor } from "@/lib/colors";
import type { EarlyWarning } from "@/lib/insight/early-warning";
import { CheckEngineLight } from "./check-engine-light";
import { TodayPanel } from "./today-panel";
import { TrendChart } from "./trend-chart";

// Owns the live "what-if" state for the whole reading. The lifestyle sliders
// live here — not inside TodayPanel — so dragging one re-colours the dial, the
// check-engine light and the trend chart together: every score-driven colour
// reads off the same live buffer. The check-engine light's *level* stays the
// server's trajectory call; only its colour follows the live score.
export function LiveReading({
  analysis,
  warning,
  isDemo,
}: {
  analysis: Analysis;
  warning: EarlyWarning;
  isDemo: boolean;
}) {
  const { baselines, inputsToday } = analysis;
  const [diet, setDiet] = useState(Math.round(inputsToday.diet ?? 6));
  const [social, setSocial] = useState(Math.round(inputsToday.social ?? 6));
  const [exercise, setExercise] = useState(Math.round(inputsToday.exercise ?? 20));

  const { buffer, factors, depletors } = useMemo(() => {
    const live: FactorInputs = { ...inputsToday, diet, social, exercise };
    const scored = scoreFactors(live, baselines);
    return {
      buffer: bufferFromFactors(scored),
      factors: scored,
      depletors: rankDepletors(scored, baselines),
    };
  }, [baselines, inputsToday, diet, social, exercise]);

  // Today's live value flows into the trend's final point, and the 30-day best
  // is recomputed from it — so dragging today above the old best updates the
  // "best" marker and label instead of leaving them stale.
  const { liveTrend, liveBest } = useMemo(() => {
    const t = analysis.trend.slice();
    if (t.length > 0) {
      t[t.length - 1] = { ...t[t.length - 1], bufferPct: buffer };
    }
    const best = t.reduce<Analysis["best30"]>(
      (b, p) => (!b || p.bufferPct > b.bufferPct ? p : b),
      null,
    );
    return { liveTrend: t, liveBest: best };
  }, [analysis.trend, buffer]);

  return (
    <>
      <div className="mt-4">
        <TodayPanel
          buffer={buffer}
          factors={factors}
          depletors={depletors}
          best30={liveBest?.bufferPct ?? null}
          isDemo={isDemo}
          diet={diet}
          social={social}
          exercise={exercise}
          onDiet={setDiet}
          onSocial={setSocial}
          onExercise={setExercise}
        />
      </div>

      <div className="mt-4">
        <CheckEngineLight warning={warning} color={scoreColor(buffer)} />
      </div>

      <section className="card mt-4 p-5 sm:p-7">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="eyebrow">Last 30 days</h2>
          {liveBest && (
            <span className="text-xs text-muted">best {Math.round(liveBest.bufferPct)}</span>
          )}
        </div>
        <TrendChart trend={liveTrend} best={liveBest} />
      </section>
    </>
  );
}
