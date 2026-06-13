import type { DailyReading, DateRange } from "./source";

// Apple HealthKit has no web API, so the Apple path is whatever the user can
// hand us: the big export.xml from Health → "Export All Health Data", or a daily
// JSON ping from an iOS Shortcut. Both land here and come out as DailyReadings.
//
// This is a pragmatic string parser rather than a full XML DOM — it only needs a
// handful of <Record> types and avoids pulling in an XML dependency. Apple writes
// timestamps in local time ("2026-06-10 23:30:00 -0700"), so the leading date
// and clock are already what we want and no timezone math is required.

const HRV = "HKQuantityTypeIdentifierHeartRateVariabilitySDNN";
const RESTING_HR = "HKQuantityTypeIdentifierRestingHeartRate";
const SLEEP = "HKCategoryTypeIdentifierSleepAnalysis";

interface RawRecord {
  type: string;
  value: string;
  startDate: string;
  endDate: string;
}

function parseRecords(xml: string): RawRecord[] {
  const records: RawRecord[] = [];
  // Match each <Record ...> opening tag (sleep records wrap metadata children,
  // so we deliberately don't require self-closing).
  const tag = /<Record\b([^>]*?)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(xml))) {
    const attrs = m[1];
    const get = (name: string) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
    const type = get("type");
    if (type === HRV || type === RESTING_HR || type === SLEEP) {
      records.push({
        type,
        value: get("value"),
        startDate: get("startDate"),
        endDate: get("endDate"),
      });
    }
  }
  return records;
}

const localDate = (ts: string): string | null => ts.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

const clockHours = (ts: string): number | null => {
  const m = ts.match(/[ T](\d{2}):(\d{2}):(\d{2})/);
  return m ? Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600 : null;
};

const toMs = (ts: string): number | null => {
  const m = ts.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  // Treated as UTC purely to measure a duration — the offset cancels.
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
};

const average = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

function pushTo(map: Map<string, number[]>, key: string, value: number): void {
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}

export function parseAppleHealthExport(xml: string, range?: DateRange): DailyReading[] {
  const records = parseRecords(xml);

  // Per-day accumulators. HRV and resting HR attribute to their start day; a
  // night's sleep attributes to the day you woke up.
  const hrv = new Map<string, number[]>();
  const rhr = new Map<string, number[]>();
  const sleep = new Map<string, { minutes: number; starts: string[]; ends: string[] }>();

  for (const r of records) {
    if (r.type === HRV) {
      const day = localDate(r.startDate);
      const v = Number(r.value);
      if (day && Number.isFinite(v)) pushTo(hrv, day, v);
    } else if (r.type === RESTING_HR) {
      const day = localDate(r.startDate);
      const v = Number(r.value);
      if (day && Number.isFinite(v)) pushTo(rhr, day, v);
    } else if (r.type === SLEEP && /asleep/i.test(r.value)) {
      const day = localDate(r.endDate);
      const start = toMs(r.startDate);
      const end = toMs(r.endDate);
      if (!day || start == null || end == null) continue;
      const bucket = sleep.get(day) ?? { minutes: 0, starts: [], ends: [] };
      bucket.minutes += Math.max(0, (end - start) / 60000);
      bucket.starts.push(r.startDate);
      bucket.ends.push(r.endDate);
      sleep.set(day, bucket);
    }
  }

  const days = new Set([...hrv.keys(), ...rhr.keys(), ...sleep.keys()]);
  const readings: DailyReading[] = [];

  for (const date of days) {
    if (range && (date < range.since || date > range.until)) continue;

    const night = sleep.get(date);
    let sleepHours: number | null = null;
    let sleepMidpointHours: number | null = null;
    if (night) {
      sleepHours = night.minutes / 60;
      const start = clockHours(night.starts.sort()[0]);
      const end = clockHours(night.ends.sort().at(-1)!);
      if (start != null && end != null) {
        const wrappedEnd = end < start ? end + 24 : end;
        sleepMidpointHours = ((start + wrappedEnd) / 2) % 24;
      }
    }

    readings.push({
      date,
      hrvRmssdMs: hrv.has(date) ? average(hrv.get(date)!) : null,
      restingHrBpm: rhr.has(date) ? average(rhr.get(date)!) : null,
      sleepHours,
      sleepMidpointHours,
    });
  }

  return readings.sort((a, b) => a.date.localeCompare(b.date));
}

// The iOS Shortcut posts one day at a time as JSON. Field names vary depending on
// how the Shortcut was built, so we accept a few aliases.
export function parseShortcutPayload(body: unknown): DailyReading | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const num = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = Number(b[k]);
      if (Number.isFinite(v)) return v;
    }
    return null;
  };
  const date = typeof b.date === "string" ? b.date.slice(0, 10) : null;
  if (!date) return null;

  return {
    date,
    hrvRmssdMs: num("hrv", "hrvRmssdMs", "heartRateVariability"),
    restingHrBpm: num("restingHr", "restingHrBpm", "restingHeartRate"),
    sleepHours: num("sleepHours", "sleep"),
    sleepMidpointHours: num("sleepMidpointHours", "sleepMidpoint"),
    raw: body,
  };
}
