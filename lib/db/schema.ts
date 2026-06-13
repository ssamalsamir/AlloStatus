import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  smallint,
  date,
  time,
  jsonb,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── Auth.js tables ──────────────────────────────────────────────────────────
// The shape here is fixed by @auth/drizzle-adapter. Don't rename columns.
// Reference: https://authjs.dev/getting-started/adapters/drizzle

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Our own additions ↓
  timezone: text("timezone").default("UTC").notNull(),
  shortcutToken: text("shortcut_token"), // per-user secret for the iOS Shortcut
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// ─── AlloStatus domain tables ────────────────────────────────────────────────

/**
 * One row per (user, source, day). `raw_payload` keeps the original wearable
 * response so we can re-derive factors later without re-fetching.
 */
export const wearableReadings = pgTable(
  "wearable_reading",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // 'google_fit' | 'apple_health_export' | 'apple_shortcut' | 'manual'
    date: date("date", { mode: "string" }).notNull(),
    hrvRmssdMs: real("hrv_rmssd_ms"),
    sleepHours: real("sleep_hours"),
    sleepMidpoint: time("sleep_midpoint"), // for sleep-consistency calc
    restingHrBpm: real("resting_hr_bpm"),
    rawPayload: jsonb("raw_payload"),
    ingestedAt: timestamp("ingested_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("wearable_reading_user_source_date_idx").on(
      table.userId,
      table.source,
      table.date,
    ),
  ],
);

export const lifestyleEntries = pgTable(
  "lifestyle_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    dietQuality: smallint("diet_quality"), // 1–5
    socialSupport: smallint("social_support"), // 1–5
    exerciseMin: smallint("exercise_min"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("lifestyle_entry_user_date_idx").on(table.userId, table.date),
  ],
);

/**
 * Cache table — drop and recompute from readings + lifestyle anytime.
 * Storing the breakdown blob means the UI doesn't have to re-run the scoring
 * engine on every render.
 */
export const resilienceScores = pgTable(
  "resilience_score",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    bufferPct: real("buffer_pct").notNull(),
    factorBreakdown: jsonb("factor_breakdown").notNull(),
    topDepletors: jsonb("top_depletors").notNull(),
    computedAt: timestamp("computed_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
);

/**
 * Rolling 30-day mean & SD per factor. Recomputed when new readings land.
 * We keep it as a table (not just compute on the fly) so the scoring engine
 * stays O(1) per score, not O(30) — matters when we re-score history.
 */
export const userBaselines = pgTable(
  "user_baseline",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    factor: text("factor").notNull(), // 'hrv' | 'sleep_consistency' | 'resting_hr' | 'diet' | 'social' | 'exercise'
    mean: real("mean").notNull(),
    sd: real("sd").notNull(),
    sampleCount: smallint("sample_count").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.factor] })],
);
