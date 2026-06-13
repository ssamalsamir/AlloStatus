import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// Connect on first call rather than at import, so the module stays importable in
// demo mode (no DATABASE_URL) — nothing here touches Postgres until a query
// layer actually asks for the database. We hand back the real Drizzle instance
// (not a wrapper) because the Auth.js adapter inspects it to detect the dialect.
let connection: Db | null = null;

export function getDb(): Db {
  if (connection) return connection;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Provision Neon via the Vercel Marketplace and run `vercel env pull .env.local`, or run in demo mode with an empty .env.",
    );
  }

  // Prepared statements off plays nicely with serverless poolers like Neon's.
  connection = drizzle(postgres(url, { prepare: false }), { schema });
  return connection;
}
