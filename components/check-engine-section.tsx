"use client";

import { useEffect, useState } from "react";
import { CheckEngineLight } from "./check-engine-light";
import { useTrendEvents } from "./trend-events-provider";
import { detectEarlyWarning, type EarlyWarning } from "@/lib/insight/early-warning";
import type { Analysis } from "@/lib/scoring";

/** Re-runs early warning when tags change so the light stays in sync. */
export function CheckEngineLightWithEvents({
  analysis,
  initialWarning,
}: {
  analysis: Analysis;
  initialWarning: EarlyWarning;
}) {
  const { events } = useTrendEvents();
  const [warning, setWarning] = useState(initialWarning);

  useEffect(() => {
    setWarning(detectEarlyWarning(analysis, events));
  }, [analysis, events]);

  return <CheckEngineLight warning={warning} />;
}
