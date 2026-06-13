// The seam between "where the numbers come from" and everything downstream.
// Every integration — Google Fit, an Apple Health export, a daily iOS Shortcut,
// or an aggregator we might add later — returns the same DailyReading shape, so
// the scoring engine and storage never need to know which one produced a day.

export interface DailyReading {
  date: string; // yyyy-mm-dd, the local calendar day the reading belongs to
  hrvRmssdMs: number | null;
  sleepHours: number | null;
  sleepMidpointHours: number | null; // decimal hours, 0–24
  restingHrBpm: number | null;
  /** The untouched source payload, persisted so we can re-derive factors later
   *  without re-fetching. */
  raw?: unknown;
}

export interface DateRange {
  since: string; // yyyy-mm-dd inclusive
  until: string; // yyyy-mm-dd inclusive
}

export interface WearableSource {
  /** Matches the `source` column on wearable_reading. */
  readonly id: string;
  fetchDailyReadings(range: DateRange): Promise<DailyReading[]>;
}
