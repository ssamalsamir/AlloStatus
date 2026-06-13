// Where the app hands off when the early-warning light is on. AlloStatus is an
// early-warning and support tool, not a diagnosis — the most useful thing it can
// do at the edge is point to people who help. National lines are listed first
// (they work for anyone, any hour); the local Santa Clara County warmline and a
// campus prompt follow, in keeping with the student focus of the brief.

export interface SupportResource {
  name: string;
  /** The concrete action — a number to call/text or who to ask. */
  action: string;
  /** Optional extra context (hours, who it's for). */
  note?: string;
  href?: string;
}

export const SUPPORT_RESOURCES: SupportResource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    action: "Call or text 988",
    note: "Free, confidential, 24/7 — for any level of distress, not only emergencies.",
    href: "https://988lifeline.org",
  },
  {
    name: "Crisis Text Line",
    action: "Text HOME to 741741",
    note: "24/7 support with a trained counselor by text.",
    href: "https://www.crisistextline.org",
  },
  {
    name: "NAMI Santa Clara County",
    action: "Warmline (408) 453-0400 x1",
    note: "Local, non-crisis support for residents and families · Mon–Fri 10am–6pm.",
    href: "https://namisantaclara.org",
  },
  {
    name: "Your campus counseling center",
    action: "Ask about free, confidential sessions",
    note: "Most schools offer same-week appointments and drop-in hours at no cost.",
  },
];
