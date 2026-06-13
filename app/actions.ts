"use server";

import { revalidatePath } from "next/cache";
import { demoMode } from "@/lib/config";
import { getViewer } from "@/lib/session";
import { getDb } from "@/lib/db/client";
import { lifestyleEntries } from "@/lib/db/schema";

export type SaveResult = { ok: boolean; demo?: boolean; error?: string };

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
