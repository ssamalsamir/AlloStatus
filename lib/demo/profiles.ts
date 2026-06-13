import type { DailyRecord } from "../scoring/types";
import { generateHistory, type PersonaConfig } from "./generate";

// A handful of demo people, each chosen to show the score doing something
// different. They differ mainly in their recent arc, because the buffer measures
// today against your *own* baseline — so what's interesting is the deviation,
// not the absolute health.
export interface DemoProfile {
  id: string;
  name: string;
  blurb: string;
  config: PersonaConfig;
}

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "sam",
    name: "Sam",
    blurb: "A rough week — sleep, recovery and connection all slid at once",
    config: {
      seed: 7,
      hrvBase: 48,
      restingHrBase: 57,
      sleepHoursBase: 7.3,
      sleepMidBase: 3.4,
      sleepWander: 0.4,
      exerciseScale: 1,
      dietBase: 3.7,
      socialBase: 3.7,
      arc: { days: 10, hrv: -14, restingHr: 7, sleepHours: -0.6, sleepWander: 1.0, exercise: -10, diet: -0.8, social: -1.3 },
    },
  },
  {
    id: "maya",
    name: "Maya",
    blurb: "On the way back up — a strong, consistent fortnight after a slump",
    config: {
      seed: 11,
      hrvBase: 45,
      restingHrBase: 60,
      sleepHoursBase: 7.0,
      sleepMidBase: 3.2,
      sleepWander: 0.7,
      exerciseScale: 0.8,
      dietBase: 3.2,
      socialBase: 3.2,
      arc: { days: 14, hrv: 15, restingHr: -6, sleepHours: 0.6, sleepWander: -0.5, exercise: 18, diet: 1.1, social: 1.0 },
    },
  },
  {
    id: "theo",
    name: "Theo",
    blurb: "Shift work — bedtime scattering while everything else holds",
    config: {
      seed: 23,
      hrvBase: 47,
      restingHrBase: 59,
      sleepHoursBase: 6.8,
      sleepMidBase: 4.0,
      sleepWander: 0.6,
      exerciseScale: 0.85,
      dietBase: 3.3,
      socialBase: 3.3,
      arc: { days: 12, sleepWander: 1.8, sleepHours: -0.3 },
    },
  },
  {
    id: "nadia",
    name: "Nadia",
    blurb: "Fell off the wagon — movement and meals slipped, sleep stayed solid",
    config: {
      seed: 41,
      hrvBase: 50,
      restingHrBase: 57,
      sleepHoursBase: 7.4,
      sleepMidBase: 3.0,
      sleepWander: 0.4,
      exerciseScale: 0.95,
      dietBase: 3.6,
      socialBase: 3.6,
      arc: { days: 16, exercise: -40, diet: -2.0 },
    },
  },
];

export const DEFAULT_PROFILE = DEMO_PROFILES[0];

export function profileById(id?: string | null): DemoProfile {
  return DEMO_PROFILES.find((p) => p.id === id) ?? DEFAULT_PROFILE;
}

export function recordsForProfile(id?: string | null): DailyRecord[] {
  return generateHistory(profileById(id).config);
}
