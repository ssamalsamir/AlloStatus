import { eq } from "drizzle-orm";
import { demoMode } from "@/lib/config";
import { getViewer } from "@/lib/session";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  parseAppleHealthExport,
  parseShortcutPayload,
} from "@/lib/wearables/apple-health-xml";
import { upsertReadings } from "@/lib/wearables/persist";

// Two Apple ingest paths share this endpoint:
//   • a daily iOS Shortcut POSTs JSON, authenticated by a per-user token;
//   • the signed-in user uploads their export.xml from the web app.
// The content type tells them apart.

export async function POST(request: Request): Promise<Response> {
  if (demoMode) return Response.json({ ok: true, demo: true });

  const db = getDb();
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return ingestShortcut(request, db);
  }
  return ingestExport(request, db, contentType);
}

async function ingestShortcut(request: Request, db: ReturnType<typeof getDb>): Promise<Response> {
  const token =
    new URL(request.url).searchParams.get("token") ??
    request.headers.get("x-allostatus-token");
  if (!token) return new Response("Missing token", { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.shortcutToken, token));
  if (!user) return new Response("Unknown token", { status: 401 });

  const reading = parseShortcutPayload(await request.json());
  if (!reading) return new Response("Could not read payload", { status: 400 });

  await upsertReadings(db, user.id, "apple_shortcut", [reading]);
  return Response.json({ ok: true, date: reading.date });
}

async function ingestExport(
  request: Request,
  db: ReturnType<typeof getDb>,
  contentType: string,
): Promise<Response> {
  const viewer = await getViewer();
  if (!viewer || viewer.isDemo) return new Response("Sign in to upload", { status: 401 });

  let xml: string;
  if (contentType.includes("multipart/form-data")) {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) return new Response("No file", { status: 400 });
    xml = await file.text();
  } else {
    xml = await request.text();
  }
  if (!xml.trim()) return new Response("Empty upload", { status: 400 });

  const days = await upsertReadings(
    db,
    viewer.id,
    "apple_health_export",
    parseAppleHealthExport(xml),
  );
  return Response.json({ ok: true, days });
}
