"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { randomSeed } from "@/lib/demo/sample";

// "Pull new sample" — step-based progress that matches what's on screen, then
// holds while the new dashboard renders so the bar never jumps backward.

const STEPS = [
  "Connecting to device",
  "Reading heart-rate variability",
  "Pulling sleep & resting heart rate",
  "Loading the last 60 days",
  "Scoring your buffer",
] as const;

const STEP_MS = 420;
const OPENING_LABEL = "Opening your reading";

export function SamplePuller({ label = "Pull new sample" }: { label?: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [navPending, startNav] = useTransition();
  const [pulling, setPulling] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setMounted(true);
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  function pull() {
    if (pulling || navPending) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];

    setPulling(true);
    setStepIndex(0);

    const seed = randomSeed();

    STEPS.forEach((_, i) => {
      if (i === 0) return;
      const t = setTimeout(() => setStepIndex(i), STEP_MS * i);
      timers.current.push(t);
    });

    const finish = setTimeout(() => {
      setPulling(false);
      startNav(() => router.push(`/dashboard?seed=${seed}`));
    }, STEP_MS * STEPS.length);
    timers.current.push(finish);
  }

  const active = pulling || navPending;
  const progress = navPending
    ? 100
    : pulling
      ? Math.round(((stepIndex + 1) / STEPS.length) * 88)
      : 0;
  const statusLabel = navPending ? OPENING_LABEL : STEPS[stepIndex];

  // Render a static placeholder until mounted so browser extensions (which inject
  // attrs like fdprocessedid before React hydrates) can't mismatch the server HTML.
  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="btn-primary gap-2 px-5 py-2 text-sm opacity-60"
        aria-hidden
      >
        <RefreshIcon spinning={false} />
        {label}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={pull}
        disabled={active}
        suppressHydrationWarning
        className="btn-primary gap-2 px-5 py-2 text-sm disabled:opacity-60"
      >
        <RefreshIcon spinning={active} />
        {active ? "Pulling…" : label}
      </button>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-6 backdrop-blur-[6px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="card w-full max-w-sm p-7 sm:p-8">
            <p className="eyebrow text-center">Demo sync</p>
            <p className="font-display mt-2 text-center text-2xl text-foreground">
              Pulling a new sample
            </p>
            <p className="mt-2 text-center text-sm text-muted">{statusLabel}…</p>

            <ol className="mt-6 space-y-2">
              {STEPS.map((step, i) => {
                const done = navPending || i < stepIndex;
                const current = !navPending && i === stepIndex;
                return (
                  <li
                    key={step}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                      current ? "bg-surface-2/90 text-foreground" : "text-muted"
                    }`}
                  >
                    <StepMark done={done} current={current} />
                    <span className={done && !current ? "line-through opacity-60" : undefined}>
                      {step}
                    </span>
                  </li>
                );
              })}
              {navPending && (
                <li className="flex items-center gap-3 rounded-xl bg-surface-2/90 px-3 py-2 text-sm text-foreground">
                  <StepMark done={false} current />
                  <span>{OPENING_LABEL}</span>
                </li>
              )}
            </ol>

            <div className="mt-6">
              <div className="mb-1.5 flex justify-between text-xs tabular-nums text-muted">
                <span>
                  Step {navPending ? STEPS.length : stepIndex + 1} of {STEPS.length}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.max(8, progress)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StepMark({ done, current }: { done: boolean; current: boolean }) {
  if (done) {
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "var(--accent)" }}
        aria-hidden
      >
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`size-5 shrink-0 rounded-full border-2 ${
        current ? "border-accent bg-accent/10" : "border-border bg-surface"
      }`}
      aria-hidden
    />
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-4 ${spinning ? "animate-spin" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}
