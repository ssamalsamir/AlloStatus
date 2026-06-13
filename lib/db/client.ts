import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Run `vercel env pull .env.local`.");
}

// Neon (and most serverless Postgres) work best with prepared statements off
// when used from short-lived serverless functions.
const queryClient = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(queryClient, { schema });
export type Db = typeof db;
