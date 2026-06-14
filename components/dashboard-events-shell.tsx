"use client";

import type { ReactNode } from "react";
import { TrendEventsProvider } from "@/components/trend-events-provider";
import { LiveInputsProvider, type LiveInputs } from "@/components/live-inputs-provider";
import { ChatWidget } from "@/components/chat-widget";
import type { TrendEvent } from "@/lib/events/types";

/** Client shell so trend tags, the live what-if inputs, and chat all share one
 *  store — every score-driven surface (dial, light, chart, chat) reads the same
 *  live reading. */
export function DashboardEventsShell({
  initialEvents,
  initialInputs,
  isDemo,
  demoSeed,
  children,
}: {
  initialEvents: TrendEvent[];
  initialInputs: LiveInputs;
  isDemo: boolean;
  demoSeed?: number;
  children: ReactNode;
}) {
  return (
    <TrendEventsProvider initialEvents={initialEvents} isDemo={isDemo} demoSeed={demoSeed}>
      <LiveInputsProvider initial={initialInputs}>
        {children}
        <ChatWidget seed={isDemo ? demoSeed : undefined} />
      </LiveInputsProvider>
    </TrendEventsProvider>
  );
}
