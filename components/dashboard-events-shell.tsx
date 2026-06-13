"use client";

import type { ReactNode } from "react";
import { TrendEventsProvider } from "@/components/trend-events-provider";
import { ChatWidget } from "@/components/chat-widget";
import type { TrendEvent } from "@/lib/events/types";

/** Client shell so trend tags and chat share one live events store. */
export function DashboardEventsShell({
  initialEvents,
  isDemo,
  demoSeed,
  children,
}: {
  initialEvents: TrendEvent[];
  isDemo: boolean;
  demoSeed?: number;
  children: ReactNode;
}) {
  return (
    <TrendEventsProvider initialEvents={initialEvents} isDemo={isDemo} demoSeed={demoSeed}>
      {children}
      <ChatWidget seed={isDemo ? demoSeed : undefined} />
    </TrendEventsProvider>
  );
}
