import { describe, expect, it } from "vitest";
import {
  parseAppleHealthExport,
  parseShortcutPayload,
} from "../../lib/wearables/apple-health-xml";

// A trimmed slice of a real Health export: two HRV samples and a resting HR on
// the 10th, plus a sleep block that starts the night of the 9th and ends on the
// 10th (so it belongs to the 10th). The sleep record carries a metadata child to
// make sure the parser handles non-self-closing tags.
const SAMPLE = `
<HealthData>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" unit="ms" startDate="2026-06-10 07:01:00 -0700" endDate="2026-06-10 07:01:00 -0700" value="42.5"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" unit="ms" startDate="2026-06-10 07:20:00 -0700" endDate="2026-06-10 07:20:00 -0700" value="37.5"/>
  <Record type="HKQuantityTypeIdentifierRestingHeartRate" unit="count/min" startDate="2026-06-10 08:00:00 -0700" endDate="2026-06-10 08:00:00 -0700" value="58"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-06-09 23:30:00 -0700" endDate="2026-06-10 06:45:00 -0700" value="HKCategoryValueSleepAnalysisAsleepCore">
    <MetadataEntry key="HKTimeZone" value="America/Los_Angeles"/>
  </Record>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-06-10 14:00:00 -0700" endDate="2026-06-10 14:30:00 -0700" value="HKCategoryValueSleepAnalysisInBed"/>
</HealthData>
`;

describe("parseAppleHealthExport", () => {
  it("aggregates HRV, resting HR and sleep onto the right day", () => {
    const [day] = parseAppleHealthExport(SAMPLE);

    expect(day.date).toBe("2026-06-10");
    expect(day.hrvRmssdMs).toBeCloseTo(40, 5); // (42.5 + 37.5) / 2
    expect(day.restingHrBpm).toBe(58);
    expect(day.sleepHours).toBeCloseTo(7.25, 5); // 23:30 → 06:45
    expect(day.sleepMidpointHours).toBeCloseTo(3.125, 3); // ~03:07, wraps midnight
  });

  it("ignores in-bed-but-awake time", () => {
    // The 14:00 InBed record must not add to sleep hours.
    const [day] = parseAppleHealthExport(SAMPLE);
    expect(day.sleepHours).toBeLessThan(8);
  });

  it("respects a date range", () => {
    expect(parseAppleHealthExport(SAMPLE, { since: "2026-07-01", until: "2026-07-31" })).toHaveLength(0);
  });
});

describe("parseShortcutPayload", () => {
  it("reads a shortcut JSON ping with aliased field names", () => {
    const reading = parseShortcutPayload({
      date: "2026-06-12",
      hrv: 51,
      restingHeartRate: 55,
      sleepHours: 7.8,
      sleepMidpoint: 3.2,
    });
    expect(reading).toMatchObject({
      date: "2026-06-12",
      hrvRmssdMs: 51,
      restingHrBpm: 55,
      sleepHours: 7.8,
      sleepMidpointHours: 3.2,
    });
  });

  it("rejects payloads without a date", () => {
    expect(parseShortcutPayload({ hrv: 50 })).toBeNull();
    expect(parseShortcutPayload(null)).toBeNull();
  });
});
