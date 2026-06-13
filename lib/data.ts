import { and, eq, gte } from "drizzle-orm";
import { analyze, type Analysis, type DailyRecord } from "@/lib/scoring";
import { generateHistory } from "@/lib/demo/generate";
import { getDb } from "@/lib/db/client";
import { lifestyleEntries, wearableReadings } from "@/lib/db/schema";
import type { Viewer } from "@/lib/session";

// We look back far enough to fill the 30-day baseline and the 30-day trend with
// room to spare. Older readings just don't affect today's score.
const LOOKBACK_DAYS = 120;

export async function loadAnalysis(viewer: Viewer): Promise<Analysis> {
  const records = viewer.isDemo
    ? generateHistory()
    : await fetchRecords(viewer.id);
  return analyze(records);
}

async function fetchRecords(userId: string): Promise<DailyRecord[]> {
  const db = getDb();
  const since = isoDaysAgo(LOOKBACK_DAYS);

  const [wearable, lifestyle] = await Promise.all([
    db
      .select()
      .from(wearableReadings)
      .where(and(eq(wearableReadings.userId, userId), gte(wearableReadings.date, since))),
    db
      .select()
      .from(lifestyleEntries)
      .where(and(eq(lifestyleEntries.userId, userId), gte(lifestyleEntries.date, since))),
  ]);

  // Merge the two tables onto one row per day. A person can have several
  // wearable sources on the same date (a watch and a Shortcut, say), so we
  // coalesce — the first non-null value for each signal wins.
  const byDate = new Map<string, DailyRecord>();
  const blank = (date: string): DailyRecord => ({
    date,
    hrvRmssdMs: null,
    sleepHours: null,
    sleepMidpointHours: null,
    restingHrBpm: null,
    dietQuality: null,
    socialSupport: null,
    exerciseMin: null,
  });

  for (const w of wearable) {
    const row = byDate.get(w.date) ?? blank(w.date);
    row.hrvRmssdMs ??= w.hrvRmssdMs;
    row.sleepHours ??= w.sleepHours;
    row.sleepMidpointHours ??= w.sleepMidpoint ? timeToHours(w.sleepMidpoint) : null;
    row.restingHrBpm ??= w.restingHrBpm;
    byDate.set(w.date, row);
  }

  for (const l of lifestyle) {
    const row = byDate.get(l.date) ?? blank(l.date);
    row.dietQuality ??= l.dietQuality;
    row.socialSupport ??= l.socialSupport;
    row.exerciseMin ??= l.exerciseMin;
    byDate.set(l.date, row);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function timeToHours(time: string): number {
  const [h, m, s] = time.split(":").map(Number);
  return h + (m ?? 0) / 60 + (s ?? 0) / 3600;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
