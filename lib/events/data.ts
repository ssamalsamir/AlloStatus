import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { trendEvents } from "@/lib/db/schema";
import type { TrendEvent } from "./types";

const LOOKBACK_DAYS = 120;

export async function loadTrendEvents(userId: string): Promise<TrendEvent[]> {
  const db = getDb();
  const since = isoDaysAgo(LOOKBACK_DAYS);

  const rows = await db
    .select({
      id: trendEvents.id,
      date: trendEvents.date,
      category: trendEvents.category,
      note: trendEvents.note,
    })
    .from(trendEvents)
    .where(and(eq(trendEvents.userId, userId), gte(trendEvents.date, since)))
    .orderBy(trendEvents.date);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    category: r.category as TrendEvent["category"],
    note: r.note,
  }));
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
