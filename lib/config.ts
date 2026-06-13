// What's wired up right now decides how the app behaves. The real, persistent
// experience needs both a database and Google sign-in; until those exist (or if
// you set ALLOSTATUS_DEMO=1 on purpose) we fall back to demo mode, which runs
// the entire product against generated data so nothing is blocked on
// provisioning. This mirrors how the rest of the codebase stays runnable from a
// fresh clone with an empty .env.

const set = (v: string | undefined | null): boolean =>
  typeof v === "string" && v.trim().length > 0;

export const hasDatabase = set(process.env.DATABASE_URL);

export const hasGoogleOAuth =
  set(process.env.AUTH_GOOGLE_ID) && set(process.env.AUTH_GOOGLE_SECRET);

export const forcedDemo = process.env.ALLOSTATUS_DEMO === "1";

export const demoMode = forcedDemo || !hasDatabase || !hasGoogleOAuth;
