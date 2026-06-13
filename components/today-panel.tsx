"use client";

import { useState, useTransition } from "react";
import type { Depletor, FactorScore } from "@/lib/scoring";
import { scoreLabel } from "@/lib/colors";
import { saveLifestyle } from "@/app/actions";
import { BufferRing } from "./buffer-ring";
import { DepletionList } from "./depletion-list";
import { FactorBars } from "./factor-bars";

// The interactive heart of the dashboard — now presentational. Its parent
// (LiveReading) owns the slider state and runs the scoring, so the buffer dial,
// the depletion ranking, the factor bars, the check-engine light and the trend
// chart all move together off one live computation.
export function TodayPanel({
  buffer,
  factors,
  depletors,
  best30,
  isDemo,
  diet,
  social,
  exercise,
  onDiet,
  onSocial,
  onExercise,
}: {
  buffer: number;
  factors: FactorScore[];
  depletors: Depletor[];
  best30: number | null;
  isDemo: boolean;
  diet: number;
  social: number;
  exercise: number;
  onDiet: (n: number) => void;
  onSocial: (n: number) => void;
  onExercise: (n: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<"saved" | "demo" | null>(null);

  const gap = best30 != null ? best30 - buffer : null;

  function save() {
    setSaved(null);
    startTransition(async () => {
      const res = await saveLifestyle({ diet, social, exercise });
      setSaved(res.demo ? "demo" : res.ok ? "saved" : null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Hero: the score, the gap, and the ranked nudges. */}
      <section className="card p-5 sm:p-7">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* No colour override: the ring uses the score ramp, so its colour
              matches the actual buffer value and the trend chart below. */}
          <BufferRing value={buffer} />
          <div className="space-y-2.5 text-center sm:text-left">
            <p className="eyebrow">Resilience buffer · today</p>
            <p className="font-display text-4xl text-foreground">{scoreLabel(buffer)}</p>
            <p className="text-sm text-muted leading-relaxed">
              {gap == null
                ? "Building your baseline — keep logging and this sharpens up."
                : gap > 1
                  ? `${Math.round(gap)} points below your 30-day best. The ranked factors below are where it went.`
                  : "You're right at your 30-day best. Protect whatever you changed."}
            </p>
          </div>
        </div>

        <hr className="my-6 border-border" />

        <h2 className="eyebrow mb-4">What&apos;s depleting your buffer</h2>
        <DepletionList depletors={depletors} />
      </section>

      {/* Full transparency: every factor versus your own normal. */}
      <section className="card p-5 sm:p-7">
        <h2 className="eyebrow mb-5">Your six factors today</h2>
        <FactorBars factors={factors} />
        <p className="mt-4 text-xs text-muted">
          Each bar is today against your own 30-day normal — right and green is
          helping, left and clay is dragging.
        </p>
      </section>

      {/* The inputs you actually control, with a live preview of their effect. */}
      <section className="card p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="eyebrow">Adjust today&apos;s inputs</h2>
          <div className="flex items-center gap-3">
            {saved === "demo" && (
              <span className="text-xs text-muted">Preview only in demo</span>
            )}
            {saved === "saved" && <span className="text-xs text-muted">Saved</span>}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="btn-primary px-5 py-2 text-sm"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <Slider
            label="Diet quality"
            value={diet}
            min={1}
            max={10}
            step={1}
            display={`${diet}/10`}
            onChange={onDiet}
          />
          <Slider
            label="Social support"
            value={social}
            min={1}
            max={10}
            step={1}
            display={`${social}/10`}
            onChange={onSocial}
          />
          <Slider
            label="Exercise"
            value={exercise}
            min={0}
            max={120}
            step={5}
            display={`${exercise}${exercise >= 120 ? "+" : ""} min`}
            onChange={onExercise}
          />
        </div>

        <p className="mt-5 text-xs text-muted leading-relaxed">
          {isDemo
            ? "This is sample data. Drag a slider to watch the buffer and the ranking respond in real time — the same math runs on the server once you connect real data."
            : "Drag to see the effect immediately, then save to record today."}
        </p>
      </section>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: "var(--accent)" }}
      />
    </label>
  );
}
