/** User-tagged life events pinned to a day on the resilience trend. */

export const EVENT_CATEGORIES = [
  "exam",
  "poor_sleep",
  "argument",
  "illness",
  "travel",
  "deadline",
  "stress",
  "other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface TrendEvent {
  id: string;
  date: string; // yyyy-mm-dd
  category: EventCategory;
  /** Optional free-text detail (e.g. "midterm", "with roommate"). */
  note: string | null;
}
