import { and, eq } from "drizzle-orm";
import { demoMode } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { GoogleFitSource, refreshGoogleAccessToken } from "@/lib/wearables/google-fit";
import { upsertReadings } from "@/lib/wearables/persist";

// Nightly Vercel cron (see vercel.json). Walks every connected Google account,
// pulls the last few days from Fit, and upserts them. Re-pulling a few days each
// run is deliberate — late-arriving wearable data gets backfilled and the upsert
// keeps it idempotent.

type Account = typeof accounts.$inferSelect;

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  if (demoMode) {
    return Response.json({ ok: true, demo: true, message: "No-op in demo mode" });
  }

  const db = getDb();
  const connected = await db.select().from(accounts).where(eq(accounts.provider, "google"));

  const range = { since: isoDaysAgo(3), until: isoDaysAgo(0) };
  let users = 0;
  let days = 0;
  const errors: string[] = [];

  for (const account of connected) {
    try {
      const token = await accessTokenFor(account);
      const source = new GoogleFitSource(token);
      days += await upsertReadings(db, account.userId, source.id, await source.fetchDailyReadings(range));
      users += 1;
    } catch (err) {
      errors.push(`${account.userId}: ${(err as Error).message}`);
    }
  }

  return Response.json({ ok: true, users, days, errors });
}

// Vercel signs cron requests; in production set CRON_SECRET and Vercel will send
// it as a bearer token. If it's unset (local dev) we don't block the request.
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.has("x-vercel-cron")
  );
}

async function accessTokenFor(account: Account): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (account.access_token && account.expires_at && account.expires_at - 60 > now) {
    return account.access_token;
  }
  if (!account.refresh_token) {
    throw new Error("no refresh token on file — needs to reconnect Google");
  }

  const { accessToken, expiresAt } = await refreshGoogleAccessToken(account.refresh_token);
  await getDb()
    .update(accounts)
    .set({ access_token: accessToken, expires_at: expiresAt })
    .where(
      and(
        eq(accounts.provider, account.provider),
        eq(accounts.providerAccountId, account.providerAccountId),
      ),
    );
  return accessToken;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
