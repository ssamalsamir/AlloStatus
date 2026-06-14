import type { EventCategory } from "./types";

export interface EventCategoryMeta {
  label: string;
  shortLabel: string; 
  /** Small glyph for chart markers — kept to a single character for SVG labels. */
  glyph: string;
  color: string;
}

export const EVENT_CATEGORY_META: Record<EventCategory, EventCategoryMeta> = {
  exam: {
    label: "Exam / test",
    shortLabel: "Exam",
    glyph: "E",
    color: "hsl(280 28% 52%)",
  },
  poor_sleep: {
    label: "Poor sleep",
    shortLabel: "Sleep",
    glyph: "Z",
    color: "hsl(210 32% 48%)",
  },
  argument: {
    label: "Argument / conflict",
    shortLabel: "Conflict",
    glyph: "!",
    color: "hsl(12 48% 52%)",
  },
  illness: {
    label: "Illness",
    shortLabel: "Ill",
    glyph: "+",
    color: "hsl(8 42% 50%)",
  },
  travel: {
    label: "Travel",
    shortLabel: "Travel",
    glyph: "T",
    color: "hsl(155 28% 42%)",
  },
  deadline: {
    label: "Deadline / crunch",
    shortLabel: "Crunch",
    glyph: "D",
    color: "hsl(36 48% 48%)",
  },
  stress: {
    label: "Stress",
    shortLabel: "Stress",
    glyph: "S",
    color: "hsl(26 44% 50%)",
  },
  other: {
    label: "Other",
    shortLabel: "Note",
    glyph: "·",
    color: "hsl(38 12% 52%)",
  },
};

export function categoryMeta(category: EventCategory): EventCategoryMeta {
  return EVENT_CATEGORY_META[category];
}

export function eventLabel(event: { category: EventCategory; note: string | null }): string {
  const base = categoryMeta(event.category).shortLabel;
  return event.note?.trim() ? `${base}: ${event.note.trim()}` : base;
}
