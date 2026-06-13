import type { Db } from "@/lib/db/client";
import { wearableReadings } from "@/lib/db/schema";
import type { DailyReading } from "./source";

/** Decimal hours → a Postgres `time` string ("HH:MM:SS"), wrapping into 0–24. */
export function hoursToClock(hours: number | null): string | null {
  if (hours == null) return null;
  const seconds = Math.round((((hours % 24) + 24) % 24) * 3600);
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  return [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * Upsert a batch of readings, one row per (user, source, day). Re-running an
 * import just refreshes the same rows — the unique index on
 * (user_id, source, date) makes the whole thing idempotent, which matters for a
 * nightly cron that re-pulls the last few days.
 */
export async function upsertReadings(
  db: Db,
  userId: string,
  source: string,
  readings: DailyReading[],
): Promise<number> {
  for (const r of readings) {
    const fields = {
      hrvRmssdMs: r.hrvRmssdMs,
      sleepHours: r.sleepHours,
      sleepMidpoint: hoursToClock(r.sleepMidpointHours),
      restingHrBpm: r.restingHrBpm,
      rawPayload: r.raw ?? null,
    };
    await db
      .insert(wearableReadings)
      .values({ userId, source, date: r.date, ...fields })
      .onConflictDoUpdate({
        target: [wearableReadings.userId, wearableReadings.source, wearableReadings.date],
        set: fields,
      });
  }
  return readings.length;
}
