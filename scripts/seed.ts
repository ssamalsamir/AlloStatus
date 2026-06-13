import { config } from "dotenv";
// `vercel env pull` writes .env.local; fall back to .env for anything else.
config({ path: ".env.local" });
config();

import { desc, eq } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { lifestyleEntries, users } from "@/lib/db/schema";
import { generateHistory } from "@/lib/demo/generate";
import { upsertReadings } from "@/lib/wearables/persist";

// Backfills 60 days of plausible history so the dashboard has something to show
// before a real wearable is connected. Same generator the live demo uses, just
// written to the database instead of computed on the fly.
//
//   npm run db:seed                 → seeds the most recent user (or creates one)
//   SEED_EMAIL=me@example.com npm run db:seed

async function main() {
  const db = getDb();
  const user = await resolveUser(db, process.env.SEED_EMAIL);
  console.log(`Seeding 60 days for ${user.email} (${user.id})`);

  const records = generateHistory();

  const wearableDays = await upsertReadings(
    db,
    user.id,
    "seed",
    records.map((r) => ({
      date: r.date,
      hrvRmssdMs: r.hrvRmssdMs,
      sleepHours: r.sleepHours,
      sleepMidpointHours: r.sleepMidpointHours,
      restingHrBpm: r.restingHrBpm,
    })),
  );

  for (const r of records) {
    const fields = {
      dietQuality: r.dietQuality,
      socialSupport: r.socialSupport,
      exerciseMin: r.exerciseMin,
    };
    await db
      .insert(lifestyleEntries)
      .values({ userId: user.id, date: r.date, ...fields })
      .onConflictDoUpdate({
        target: [lifestyleEntries.userId, lifestyleEntries.date],
        set: fields,
      });
  }

  console.log(`Done — ${wearableDays} wearable days and ${records.length} lifestyle days.`);
  process.exit(0);
}

async function resolveUser(db: Db, email?: string) {
  if (email) {
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) return existing;
    const [created] = await db
      .insert(users)
      .values({ email, name: email.split("@")[0] })
      .returning();
    return created;
  }

  const [recent] = await db.select().from(users).orderBy(desc(users.createdAt)).limit(1);
  if (recent) return recent;

  const [created] = await db
    .insert(users)
    .values({ email: "demo@allostatus.app", name: "Demo" })
    .returning();
  return created;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
