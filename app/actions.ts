"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { demoMode } from "@/lib/config";
import { getViewer } from "@/lib/session";
import { getDb } from "@/lib/db/client";
import { lifestyleEntries, trendEvents } from "@/lib/db/schema";
import { EVENT_CATEGORIES, type EventCategory, type TrendEvent } from "@/lib/events/types";

export type SaveResult = { ok: boolean; demo?: boolean; error?: string };

export type EventActionResult =
  | { ok: true; event: TrendEvent }
  | { ok: false; demo?: boolean; error?: string };

// Server Actions are reachable by direct POST, so the auth check lives here and
// not just in the UI. In demo mode there's nothing to persist — the sliders are
// a live what-if — so we acknowledge and return early.
export async function saveLifestyle(input: {
  diet: number;
  social: number;
  exercise: number;
}): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Not signed in" };
  if (demoMode || viewer.isDemo) return { ok: true, demo: true };

  const db = getDb();
  const date = new Date().toISOString().slice(0, 10);
  await db
    .insert(lifestyleEntries)
    .values({
      userId: viewer.id,
      date,
      dietQuality: input.diet,
      socialSupport: input.social,
      exerciseMin: input.exercise,
    })
    .onConflictDoUpdate({
      target: [lifestyleEntries.userId, lifestyleEntries.date],
      set: {
        dietQuality: input.diet,
        socialSupport: input.social,
        exerciseMin: input.exercise,
      },
    });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveTrendEvent(input: {
  date: string;
  category: EventCategory;
  note?: string;
}): Promise<EventActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Not signed in" };
  if (demoMode || viewer.isDemo) return { ok: false, demo: true, error: "Demo mode" };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false, error: "Invalid date" };
  }
  if (!EVENT_CATEGORIES.includes(input.category)) {
    return { ok: false, error: "Invalid category" };
  }

  const note = input.note?.trim() || null;
  const db = getDb();
  const [row] = await db
    .insert(trendEvents)
    .values({
      userId: viewer.id,
      date: input.date,
      category: input.category,
      note,
    })
    .returning({
      id: trendEvents.id,
      date: trendEvents.date,
      category: trendEvents.category,
      note: trendEvents.note,
    });

  revalidatePath("/dashboard");
  return {
    ok: true,
    event: {
      id: row.id,
      date: row.date,
      category: row.category as EventCategory,
      note: row.note,
    },
  };
}

export async function deleteTrendEvent(input: { id: string }): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Not signed in" };
  if (demoMode || viewer.isDemo) return { ok: true, demo: true };

  const db = getDb();
  await db
    .delete(trendEvents)
    .where(and(eq(trendEvents.id, input.id), eq(trendEvents.userId, viewer.id)));

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateTrendEvent(input: {
  id: string;
  category?: EventCategory;
  note?: string | null;
}): Promise<EventActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Not signed in" };
  if (demoMode || viewer.isDemo) return { ok: false, demo: true, error: "Demo mode" };

  if (input.category && !EVENT_CATEGORIES.includes(input.category)) {
    return { ok: false, error: "Invalid category" };
  }

  const note = input.note !== undefined ? input.note?.trim() || null : undefined;
  const db = getDb();
  const patch: { category?: string; note?: string | null } = {};
  if (input.category) patch.category = input.category;
  if (note !== undefined) patch.note = note;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nothing to update" };
  }

  const [row] = await db
    .update(trendEvents)
    .set(patch)
    .where(and(eq(trendEvents.id, input.id), eq(trendEvents.userId, viewer.id)))
    .returning({
      id: trendEvents.id,
      date: trendEvents.date,
      category: trendEvents.category,
      note: trendEvents.note,
    });

  if (!row) return { ok: false, error: "Not found" };

  revalidatePath("/dashboard");
  return {
    ok: true,
    event: {
      id: row.id,
      date: row.date,
      category: row.category as EventCategory,
      note: row.note,
    },
  };
}
