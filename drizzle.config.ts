import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// `vercel env pull` writes .env.local; load that first, then fall back to .env.
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
