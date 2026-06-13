"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { deleteTrendEvent, saveTrendEvent, updateTrendEvent } from "@/app/actions";
import { loadDemoEvents, saveDemoEvents } from "@/lib/events/demo-storage";
import { type EventCategory, type TrendEvent } from "@/lib/events/types";

type TrendEventsContextValue = {
  events: TrendEvent[];
  isDemo: boolean;
  pending: boolean;
  addEvent: (date: string, category: EventCategory, note: string | null) => Promise<boolean>;
  updateEvent: (
    id: string,
    patch: { category?: EventCategory; note?: string | null },
  ) => Promise<boolean>;
  removeEvent: (id: string) => Promise<boolean>;
};

const TrendEventsContext = createContext<TrendEventsContextValue | null>(null);

function newDemoEvent(date: string, category: EventCategory, note: string | null): TrendEvent {
  return { id: crypto.randomUUID(), date, category, note };
}

export function TrendEventsProvider({
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
  const [events, setEvents] = useState<TrendEvent[]>(initialEvents);
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setEvents(loadDemoEvents(demoSeed));
    }
    setMounted(true);
  }, [isDemo, demoSeed]);

  const persistDemo = useCallback(
    (updater: (prev: TrendEvent[]) => TrendEvent[]) => {
      setEvents((prev) => {
        const next = updater(prev);
        saveDemoEvents(demoSeed, next);
        return next;
      });
    },
    [demoSeed],
  );

  const addEvent = useCallback(
    async (date: string, category: EventCategory, note: string | null) => {
      setPending(true);
      try {
        if (isDemo) {
          persistDemo((prev) => [...prev, newDemoEvent(date, category, note)]);
          return true;
        }
        const res = await saveTrendEvent({ date, category, note: note ?? undefined });
        if (res.ok) setEvents((prev) => [...prev, res.event]);
        return res.ok;
      } finally {
        setPending(false);
      }
    },
    [isDemo, persistDemo],
  );

  const updateEvent = useCallback(
    async (id: string, patch: { category?: EventCategory; note?: string | null }) => {
      setPending(true);
      try {
        if (isDemo) {
          persistDemo((prev) =>
            prev.map((e) =>
              e.id === id
                ? {
                    ...e,
                    category: patch.category ?? e.category,
                    note: patch.note !== undefined ? patch.note : e.note,
                  }
                : e,
            ),
          );
          return true;
        }
        const res = await updateTrendEvent({ id, ...patch });
        if (res.ok) {
          setEvents((prev) => prev.map((e) => (e.id === id ? res.event : e)));
        }
        return res.ok;
      } finally {
        setPending(false);
      }
    },
    [isDemo, persistDemo],
  );

  const removeEvent = useCallback(
    async (id: string) => {
      setPending(true);
      try {
        if (isDemo) {
          persistDemo((prev) => prev.filter((e) => e.id !== id));
          return true;
        }
        const res = await deleteTrendEvent({ id });
        if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
        return res.ok;
      } finally {
        setPending(false);
      }
    },
    [isDemo, persistDemo],
  );

  const value = useMemo(
    () => ({
      events: mounted ? events : initialEvents,
      isDemo,
      pending,
      addEvent,
      updateEvent,
      removeEvent,
    }),
    [mounted, events, initialEvents, isDemo, pending, addEvent, updateEvent, removeEvent],
  );

  return <TrendEventsContext.Provider value={value}>{children}</TrendEventsContext.Provider>;
}

export function useTrendEvents(): TrendEventsContextValue {
  const ctx = useContext(TrendEventsContext);
  if (!ctx) {
    throw new Error("useTrendEvents must be used within TrendEventsProvider");
  }
  return ctx;
}
