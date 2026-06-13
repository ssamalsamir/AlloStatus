"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

// Rolls a new random seed into the URL, which re-renders the dashboard against a
// fresh synthetic person. Client-side because the randomness has to happen on
// click; the seed itself keeps the result stable and shareable afterwards.
export function ShuffleButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function pull() {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    start(() => router.push(`/dashboard?seed=${seed}`));
  }

  return (
    <button
      type="button"
      onClick={pull}
      disabled={pending}
      className="btn-primary gap-2 px-5 py-2 text-sm disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-4 ${pending ? "animate-spin" : ""}`}
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
      {pending ? "Pulling…" : "Pull new sample"}
    </button>
  );
}
