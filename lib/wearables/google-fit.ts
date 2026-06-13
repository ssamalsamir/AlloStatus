import type { DailyReading, DateRange, WearableSource } from "./source";

// Google Fit REST integration. Heads-up for whoever maintains this: the Fit REST
// API is deprecated and sunsets in 2026, and it never exposed RMSSD HRV in the
// first place — so this fills resting heart rate and sleep, and leaves hrv null.
// That gap is exactly why WearableSource is an interface: swapping in an
// aggregator (Terra, Vital) or the Apple path covers HRV without touching the
// scoring engine.

const FIT_BASE = "https://www.googleapis.com/fitness/v1/users/me";
const DAY_MS = 86_400_000;

interface TokenSet {
  accessToken: string;
  expiresAt: number; // unix seconds
}

/** Exchange a stored refresh token for a fresh access token. */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<TokenSet> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: json.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + json.expires_in,
  };
}

export class GoogleFitSource implements WearableSource {
  readonly id = "google_fit";

  constructor(private readonly accessToken: string) {}

  async fetchDailyReadings(range: DateRange): Promise<DailyReading[]> {
    const startMs = Date.parse(`${range.since}T00:00:00Z`);
    const endMs = Date.parse(`${range.until}T00:00:00Z`) + DAY_MS;

    const [restingByDay, sleepByDay] = await Promise.all([
      this.restingHeartRate(startMs, endMs),
      this.sleep(startMs, endMs),
    ]);

    const days = new Set([...restingByDay.keys(), ...sleepByDay.keys()]);
    return [...days]
      .map((date) => ({
        date,
        hrvRmssdMs: null, // not available from Fit — see the note at the top
        restingHrBpm: restingByDay.get(date) ?? null,
        ...(sleepByDay.get(date) ?? { sleepHours: null, sleepMidpointHours: null }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Daily aggregate of heart rate; the daily minimum is a decent stand-in for
  // resting HR when a dedicated resting series isn't present.
  private async restingHeartRate(startMs: number, endMs: number): Promise<Map<string, number>> {
    const res = await fetch(`${FIT_BASE}/dataset:aggregate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
        bucketByTime: { durationMillis: DAY_MS },
        startTimeMillis: startMs,
        endTimeMillis: endMs,
      }),
    });
    if (!res.ok) throw new Error(`Fit heart-rate aggregate failed: ${res.status}`);

    const json = (await res.json()) as {
      bucket?: { startTimeMillis: string; dataset: { point: { value: { fpVal?: number }[] }[] }[] }[];
    };

    const byDay = new Map<string, number>();
    for (const bucket of json.bucket ?? []) {
      const date = isoDay(Number(bucket.startTimeMillis));
      const mins = bucket.dataset
        .flatMap((d) => d.point)
        .map((p) => p.value[0]?.fpVal)
        .filter((v): v is number => v != null);
      if (mins.length) byDay.set(date, Math.min(...mins));
    }
    return byDay;
  }

  // Sleep sessions (activityType 72). Each session becomes hours-asleep plus a
  // midpoint, attributed to the day it ended.
  private async sleep(
    startMs: number,
    endMs: number,
  ): Promise<Map<string, { sleepHours: number; sleepMidpointHours: number }>> {
    const params = new URLSearchParams({
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      activityType: "72",
    });
    const res = await fetch(`${FIT_BASE}/sessions?${params}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`Fit sessions failed: ${res.status}`);

    const json = (await res.json()) as {
      session?: { startTimeMillis: string; endTimeMillis: string }[];
    };

    const byDay = new Map<string, { sleepHours: number; sleepMidpointHours: number }>();
    for (const s of json.session ?? []) {
      const start = Number(s.startTimeMillis);
      const end = Number(s.endTimeMillis);
      const date = isoDay(end);
      byDay.set(date, {
        sleepHours: (end - start) / 3_600_000,
        sleepMidpointHours: midpointHours(start, end),
      });
    }
    return byDay;
  }
}

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

function midpointHours(startMs: number, endMs: number): number {
  const mid = new Date((startMs + endMs) / 2);
  return mid.getUTCHours() + mid.getUTCMinutes() / 60;
}
