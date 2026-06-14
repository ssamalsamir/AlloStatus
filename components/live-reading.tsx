"use client";

import { useMemo } from "react";
import { reanalyzeWithInputs, type Analysis } from "@/lib/scoring";
import { scoreBand, scoreColor } from "@/lib/colors";
import { detectEarlyWarning } from "@/lib/insight/early-warning";
import { useTrendEvents } from "./trend-events-provider";
import { useLiveInputs } from "./live-inputs-provider";
import { CheckEngineLight } from "./check-engine-light";
import { TodayPanel } from "./today-panel";
import { TrendSection } from "./trend-chart";

// Owns the live "what-if" state for the whole reading. The lifestyle sliders
// live here — not inside TodayPanel — so dragging one re-colours the dial, the
// check-engine light and the trend chart together: every score-driven colour
// reads off the same live buffer. The check-engine light updates whole-cloth
// with the live reading — colour, level, headline and signals all re-run the
// server's trajectory logic on the live buffer, factor breakdown and event
// store, so dragging a slider or adding a tag moves the warning immediately.
export function LiveReading({
  analysis,
  isDemo,
}: {
  analysis: Analysis;
  isDemo: boolean;
}) {
  const { events } = useTrendEvents();
  const { diet, social, exercise, setDiet, setSocial, setExercise } = useLiveInputs();

  // The single live reading every surface here reads from: dragging a slider
  // re-scores today against the same baselines the server used, which moves the
  // buffer, factor breakdown, depletor ranking, the trend's final point and the
  // 30-day best together. The same helper runs on the server for the chat, so
  // the dial, light, chart and chatbot never disagree.
  const live = useMemo(
    () => reanalyzeWithInputs(analysis, { diet, social, exercise }),
    [analysis, diet, social, exercise],
  );
  const { bufferPct: buffer, factors, depletors } = live.today;
  const liveTrend = live.trend;
  const liveBest = live.best30;

  // Re-run the server's trajectory logic on the *live* reading (alongside the
  // live event store) so the check-engine light's level, headline and signals
  // move with the score — not just its colour.
  const warning = useMemo(
    () => detectEarlyWarning(live, events),
    [live, events],
  );

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
        <CheckEngineLight
          warning={warning}
          color={scoreColor(buffer)}
          band={scoreBand(buffer)}
        />
      </div>

      <section className="card mt-4 p-5 sm:p-7">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="eyebrow">Last 30 days</h2>
          {liveBest && (
            <span className="text-xs text-muted">best {Math.round(liveBest.bufferPct)}</span>
          )}
        </div>
        <TrendSection trend={liveTrend} best={liveBest} />
      </section>
    </>
  );
}
