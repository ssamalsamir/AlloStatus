"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { randomSeed } from "@/lib/demo/sample";

// "Pull new sample" dressed up to feel like reading from a real wearable: a
// deliberate ~2s sync with smooth progress and plausible status steps, behind a
// soft blur, then the new sample fades in. The data is generated instantly on the
// server — this is purely the felt experience of pulling someone's data.

const DURATION_MS = 2200;

const STEPS = [
  { until: 20, label: "Connecting to device" },
  { until: 46, label: "Reading heart-rate variability" },
  { until: 70, label: "Pulling sleep & resting heart rate" },
  { until: 90, label: "Loading the last 60 days" },
  { until: 100, label: "Scoring your buffer" },
];

export function SamplePuller({ label = "Pull new sample" }: { label?: string }) {
  const router = useRouter();
  const [navPending, startNav] = useTransition();
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);

  function pull() {
    if (pulling || navPending) return;
    setPulling(true);
    setProgress(0);

    const seed = randomSeed();
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      // Ease-out: quick to begin, settling as it lands — reads as "finishing up".
      setProgress((1 - (1 - t) ** 2) * 100);
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        // Hand off to the navigation; navPending keeps the overlay up until the
        // new sample is actually rendered, so there's no flash in between.
        setPulling(false);
        startNav(() => router.push(`/dashboard?seed=${seed}`));
      }
    };
    frame.current = requestAnimationFrame(tick);
  }

  const active = pulling || navPending;
  const step = STEPS.find((s) => progress <= s.until) ?? STEPS[STEPS.length - 1];

  return (
    <>
      <button
        type="button"
        onClick={pull}
        disabled={active}
        className="btn-primary gap-2 px-5 py-2 text-sm disabled:opacity-60"
      >
        <RefreshIcon spinning={active} />
        {active ? "Pulling…" : label}
      </button>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-6 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="card w-full max-w-sm space-y-6 p-8 text-center">
            <Pulse />
            <div className="space-y-1.5">
              <p className="font-display text-xl text-foreground">Pulling a new sample</p>
              <p className="text-sm text-muted">{step.label}…</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(5, progress)}%`, transition: "width 90ms linear" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Pulse() {
  return (
    <div className="relative mx-auto size-12">
      <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
      <span className="absolute inset-0 m-auto size-3 rounded-full bg-accent" />
    </div>
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
