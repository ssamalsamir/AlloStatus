# AlloStatus

A daily **resilience-buffer** score from wearables + lifestyle, modeled after allostatic-load indices. The output isn't a "your resistance stage lasts X days" prediction — it's a **ranked breakdown of which factors are most depleting your buffer right now**, with one actionable nudge per factor.

> **For future Claude Code sessions / collaborators:** this README captures the full design + decision context from session 1 so you can pick up the build without losing thread. Scroll to [Where we left off](#where-we-left-off) for the immediate next step.

---

## Status

| Phase | Status | Notes |
|---|---|---|
| Day 1 — Next.js scaffold + Auth + DB schema | 🟡 In progress | Foundation written, Vercel-link done, **Neon provisioning + AUTH_SECRET + Google OAuth still pending** |
| Day 2 — Pure-TS scoring engine + vitest | ⏳ Pending | |
| Day 3 — Lifestyle form + dashboard MVP + seed script | ⏳ Pending | |
| Day 4 — Google Fit OAuth + nightly cron pull | ⏳ Pending | |
| Day 5 — Apple Health XML upload + iOS Shortcut endpoint | ⏳ Pending | |
| Day 6 — 30-day trend chart + nudges UI + polish | ⏳ Pending | |
| Day 7 — Deploy + dogfood | ⏳ Pending | |

---

## The product

Six inputs flow into a single transparent score:

| Factor | Source | Notes |
|---|---|---|
| HRV (RMSSD) | Wearable | Strongest single autonomic-dysregulation signal |
| Sleep consistency | Wearable | Stability of sleep midpoint, not total hours |
| Resting heart rate | Wearable | Cardiovascular sub-score from allostatic-load literature |
| Diet quality | Self-reported (1–5) | Daily 5-second slider |
| Social support | Self-reported (1–5) | Daily 5-second slider |
| Exercise minutes | Self-reported or wearable | Manual or pulled from Google Fit activity |

Each factor is direction-corrected (higher HRV = good, higher RHR = bad), z-scored against the user's own 30-day baseline, clamped, and combined with literature-anchored weights into a 0–100 **buffer percentage**.

The UI surfaces:
- Today's buffer %
- Gap from your 30-day best
- Top 1–3 **depleting factors** with a plain-language nudge each
- 30-day trend chart

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js UI)                         │
│   Today panel · Depletion list · 30-day trend chart                 │
│   Lifestyle form · Health upload · Connections (Google Fit / Apple) │
└─────────────────────────┬──────────────────────────────────────────┘
                          │  Server Actions / Route Handlers
┌─────────────────────────▼──────────────────────────────────────────┐
│                  Next.js 16 App Router (Vercel)                     │
│                                                                     │
│  /app/(auth)/login       Google sign-in via Auth.js v5              │
│  /app/dashboard          Server Components, RSC streaming           │
│  /app/api/auth/[...]     Auth.js route handler                      │
│  /app/api/health/google  Nightly pull (cron-invoked)                │
│  /app/api/health/apple   XML upload + iOS Shortcut endpoint         │
│                                                                     │
│  /lib/scoring/  ← pure TS, no I/O, fully unit-testable              │
│    ├ baselines.ts        Rolling 30-day mean & SD per user/factor   │
│    ├ weights.ts          Seeman/McEwen anchors + citations          │
│    ├ score.ts            Composite score + per-factor breakdown     │
│    └ nudges.ts           Factor → human-readable suggestion         │
│                                                                     │
│  /lib/wearables/                                                    │
│    ├ source.ts           interface WearableSource                   │
│    ├ google-fit.ts       implements WearableSource (REST + OAuth)   │
│    └ apple-health-xml.ts implements WearableSource (XML parser)     │
│                                                                     │
│  /lib/db/                Drizzle ORM + schema                       │
│  /auth.ts                Auth.js v5 config                          │
└─────────────────────────┬──────────────────────────────────────────┘
                          │  postgres-js
┌─────────────────────────▼──────────────────────────────────────────┐
│             Neon Postgres (Vercel Marketplace)                      │
│   user · account · session · verificationToken (Auth.js)            │
│   wearable_reading · lifestyle_entry · resilience_score ·           │
│   user_baseline                                                     │
└────────────────────────────────────────────────────────────────────┘
              ▲                                          ▲
              │ nightly cron (Vercel)                    │
   ┌──────────┴──────────┐                  ┌────────────┴──────────┐
   │  pull Google Fit    │                  │  Apple Health upload  │
   │  for every user     │                  │  + iOS Shortcut POST  │
   └─────────────────────┘                  └───────────────────────┘
```

**Why this shape**
- **Scoring engine is pure & isolated.** Zero I/O, no React, no DB. `vitest` covers it without touching anything else. The scoring model is the part we'll iterate on most, so it has to be cheap to change.
- **`WearableSource` interface** lets us swap Google Fit for Terra/Vital/native bridge later without rewriting anything downstream. Every source returns the same `DailyReading` shape.
- **Server Components for the dashboard** — buffer ring and depletion list render on the server with fresh data on every request. No client-side fetching dance for the first paint.
- **Cron on Vercel** handles the nightly Google Fit pull. Apple Health uploads are user-triggered (no API key needed for the iOS Shortcut path — just a per-user secret in the URL).
- **Auth.js stores Google Fit OAuth tokens in the same `account` row** as the sign-in tokens — one consent screen grants both, no second OAuth dance.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.2.9 (App Router, Turbopack) | Server Components fit the "always-fresh score" UX; ships well on Vercel |
| Language | TypeScript (strict) | Required for Drizzle's type inference and shared scoring types |
| Styling | Tailwind v4 | Default with create-next-app; minimal config |
| UI components | shadcn/ui *(not yet installed)* | Day 6 polish task |
| Auth | Auth.js v5 (`next-auth@beta`) + Google provider only | Same OAuth grant covers Google Fit scopes |
| Database | Neon Postgres (Vercel Marketplace) | Serverless, native Vercel integration |
| ORM | Drizzle + drizzle-kit | Type-safe; minimal runtime; SQL-first |
| Postgres driver | `postgres` (postgres-js) | Works well with Neon's pooler |
| Validation | Zod 4 | For form inputs + iOS Shortcut payloads |
| Tests | Vitest | Fast; ESM-native |

> **Next.js 16 gotcha:** `middleware.ts` was renamed to `proxy.ts` (same API). We don't currently use one — auth is gated inside each Server Component, which the Next.js docs explicitly recommend over proxy-based auth.

---

## Decisions log

Decisions confirmed by the user during session 1. Read `Why` before changing any of these.

### 1. Web app, no native mobile (v1)
- **Why:** Faster ship; no app-store overhead.
- **Trade-off acknowledged:** Apple HealthKit has no web API, so the Apple path is user-uploaded `export.xml` plus an iOS Shortcut that POSTs daily JSON to a per-user secret URL. A real native iOS companion is deferred to post-v1.

### 2. Google Fit REST API for the wearable layer (no aggregator)
- **Why:** Simpler integration; no third-party dependency for v1.
- **Trade-off acknowledged:** Google Fit REST API is **deprecated, sunsets early 2026**. The replacement (Health Connect) is Android on-device only — no REST. The `lib/wearables/source.ts` interface keeps the door open to swap in Terra/Vital later.

### 3. Auth.js v5 with Google provider only
- **Why:** Same OAuth grant covers Google Fit scopes — one consent screen for the user.
- **Trade-off acknowledged:** Users without a Google account can't sign in. Acceptable for v1.

### 4. Hybrid scoring model
- **Why:** Literature anchors (Seeman / McEwen allostatic-load papers) give us defensible weights; per-user rolling 30-day baseline makes the score meaningful for an individual.
- **How:** Weights live in `lib/scoring/weights.ts` as a config object with a `citation:` field per factor. Personal z-score is `(value − rolling_mean) / max(rolling_sd, sd_floor)`. Composite = `100 × sigmoid(Σ weight_i × clamp(z_i, −3, +3))`.

### 5. No wearable currently owned by user → dev seed script
- **Why:** Day 3+ would be untestable without populated history.
- **How:** `scripts/seed.ts` will generate 60 days of plausible synthetic readings against the signed-in user. Real Google Fit pull still works if/when a wearable is added.

### 6. Drizzle ORM (not raw `pg`)
- **Why:** Type-safe queries; first-class with `@auth/drizzle-adapter`.

### 7. Small, frequent commits with conventional messages
- **Why:** Easier to bisect; clearer history when re-reading the build.

---

## Scoring model spec

### Per-factor pipeline

```
raw value  →  direction-correct  →  personal z-score  →  clamp(−3, +3)  →  weighted
```

### Weights (literature-anchored)

Defined in `lib/scoring/weights.ts` (to be written on day 2):

| Factor | Weight | Anchor |
|---|---|---|
| HRV (RMSSD) | 0.22 | McEwen 2007 — autonomic dysregulation is one of the strongest single AL predictors |
| Sleep consistency | 0.20 | Seeman et al. 2001 — HPA-axis & metabolic clustering with high variability |
| Resting HR | 0.18 | Seeman 1997 — cardiovascular sub-score |
| Exercise minutes | 0.15 | McEwen & Stellar 1993 — anti-inflammatory / cortisol-buffering |
| Diet quality | 0.15 | AL metabolic cluster (glucose, lipids) |
| Social support | 0.10 | Seeman 1996 — social integration as HPA buffer |

### Personal adaptation

- Need ≥ 7 days of history before personalization kicks in.
- Before then, fall back to population reference ranges (e.g. HRV 20–60 ms RMSSD for adults).
- `sd_floor` prevents early-days noise from blowing up z-scores.

### Composite

```
weighted_sum  =  Σ (weight_i × clamp(z_i, −3, +3))
buffer_pct    =  100 × sigmoid(weighted_sum)        // 0–100, smooth, no cliffs
```

### Depletion ranking

```
depletion_i = weight_i × max(0, z_personal_best_i − z_today_i)
```

Top 1–3 depleting factors → surfaced with a nudge from `lib/scoring/nudges.ts`.

---

## Database schema

Defined in [`lib/db/schema.ts`](lib/db/schema.ts). Auth.js requires the first four tables (column shapes are fixed by the adapter). Domain tables are ours.

| Table | Purpose |
|---|---|
| `user` | Sign-in identity + our additions (`timezone`, `shortcut_token`) |
| `account` | OAuth tokens (incl. Google Fit access/refresh) |
| `session` | DB-backed session store |
| `verificationToken` | Email magic-link tokens (unused in v1 but adapter requires it) |
| `wearable_reading` | One row per (user, source, day). `raw_payload` JSONB preserves source data |
| `lifestyle_entry` | Daily self-report (diet, social, exercise) |
| `resilience_score` | **Cache table** — drop & recompute from readings + lifestyle anytime |
| `user_baseline` | Rolling 30-day mean/SD per factor |

> **Important:** `resilience_score` is a cache, not source of truth. This is what makes iterating on the scoring model safe — change a weight, drop the table, recompute.

---

## Project structure

```
allostatus/
├ app/
│  ├ (auth)/
│  │  └ login/page.tsx        ← Google sign-in button
│  ├ api/auth/[...nextauth]/
│  │  └ route.ts              ← Auth.js handlers
│  ├ dashboard/page.tsx       ← Bare scaffold for now
│  ├ layout.tsx               ← Root layout, fonts, metadata
│  ├ page.tsx                 ← Redirects to /dashboard or /login
│  └ globals.css              ← Tailwind v4
├ lib/
│  ├ db/
│  │  ├ schema.ts             ← All tables (Auth.js + domain)
│  │  └ client.ts             ← Drizzle + postgres-js
│  ├ scoring/                 ← (day 2) pure TS scoring engine
│  └ wearables/               ← (day 4–5) Google Fit + Apple impls
├ scripts/
│  └ seed.ts                  ← (day 3) synthetic 60-day backfill
├ tests/
│  └ scoring/                 ← (day 2) vitest coverage
├ drizzle/                    ← generated migrations
├ auth.ts                     ← Auth.js v5 config
├ drizzle.config.ts
├ next.config.ts
├ tsconfig.json
├ .env.example                ← required env vars (no values)
└ package.json
```

---

## Local development setup

### Prerequisites
- Node 20+ (this machine: Node 26)
- npm (no pnpm/bun on this machine)
- Vercel CLI (already installed: `vercel --version` → 54.10.3)
- Authenticated as `ssamalsamir` (confirm with `vercel whoami`)
- GitHub remote: `https://github.com/ssamalsamir/AlloStatus`

### First-time setup

```bash
# 1. Install
npm install

# 2. Link to the Vercel project (already done in session 1)
#    Project: samir-samal-s-projects/allostatus
vercel link --yes --project allostatus --scope samir-samal-s-projects

# 3. Provision Neon Postgres via Vercel Marketplace  ← PENDING
vercel integration add neon --scope samir-samal-s-projects
# → opens browser, follow Marketplace flow

# 4. Generate AUTH_SECRET and push to Vercel  ← PENDING
AUTH_SECRET="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")"
printf "%s" "$AUTH_SECRET" | vercel env add AUTH_SECRET development preview production
unset AUTH_SECRET

# 5. Set up Google OAuth credentials  ← PENDING
#    https://console.cloud.google.com → APIs & Services → Credentials
#    Create OAuth client (Web). Authorized redirect URIs:
#      http://localhost:3000/api/auth/callback/google
#      https://allostatus.vercel.app/api/auth/callback/google
#    Enable Fitness API.
vercel env add AUTH_GOOGLE_ID    # paste client ID
vercel env add AUTH_GOOGLE_SECRET # paste client secret

# 6. Pull env locally
vercel env pull .env.local --yes

# 7. Push schema to the DB
npm run db:push

# 8. Run
npm run dev
```

### Day-to-day

```bash
npm run dev              # http://localhost:3000
npm run test             # vitest run
npm run db:studio        # browse the DB
npm run db:generate      # after schema changes, generate a migration
npm run db:push          # apply schema changes directly (dev only)
```

---

## Environment variables

See [`.env.example`](.env.example) for the canonical list. Required:

| Key | Source | Used by |
|---|---|---|
| `DATABASE_URL` | Vercel + Neon | Drizzle client + drizzle-kit |
| `AUTH_SECRET` | Generated, pushed to Vercel | Auth.js session signing |
| `AUTH_GOOGLE_ID` | Google Cloud Console | Auth.js Google provider |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console | Auth.js Google provider |
| `SHORTCUT_INGEST_SECRET` | Generate locally | iOS Shortcut HMAC verification (day 5) |

> Vercel typically injects `POSTGRES_URL`. Drizzle reads `DATABASE_URL`. If the pull gives you `POSTGRES_URL` and not `DATABASE_URL`, either add a `DATABASE_URL` env var pointing to the same value, or alias in `.env.local`.

---

## Where we left off

**Session 1 ended mid-day-1 bootstrap, just after `vercel link` succeeded.**

### What's done
- ✅ Next.js 16 + Tailwind v4 scaffold (TypeScript, App Router, no `src/`)
- ✅ Dependencies installed: `drizzle-orm`, `postgres`, `next-auth@beta`, `@auth/drizzle-adapter`, `zod`, `drizzle-kit`, `tsx`, `vitest`
- ✅ Drizzle schema with all auth + domain tables ([`lib/db/schema.ts`](lib/db/schema.ts))
- ✅ Drizzle client ([`lib/db/client.ts`](lib/db/client.ts))
- ✅ Auth.js v5 config with Google provider + Fit scopes ([`auth.ts`](auth.ts))
- ✅ Auth route handler ([`app/api/auth/[...nextauth]/route.ts`](app/api/auth/[...nextauth]/route.ts))
- ✅ Landing redirect ([`app/page.tsx`](app/page.tsx))
- ✅ Login page with Google sign-in ([`app/(auth)/login/page.tsx`](app/(auth)/login/page.tsx))
- ✅ Bare dashboard with sign-out ([`app/dashboard/page.tsx`](app/dashboard/page.tsx))
- ✅ TypeScript clean (`npx tsc --noEmit` passes)
- ✅ Vercel project linked: `samir-samal-s-projects/allostatus`, auto-connected to GitHub repo

### Immediate next steps (resume here)

1. **Provision Neon Postgres** via `vercel integration add neon --scope samir-samal-s-projects` (opens browser, needs user authorization).
2. **Generate & push `AUTH_SECRET`** (one-liner above).
3. **Create Google Cloud OAuth credentials** + enable Fitness API. Push `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to Vercel.
4. **Pull env**: `vercel env pull .env.local --yes`.
5. **Push schema**: `npm run db:push` to create tables.
6. **Run dev server**: `npm run dev` and verify Google sign-in lands on `/dashboard`.
7. That finishes Day 1 → move to Day 2 (pure-TS scoring engine).

### Open questions / blocked on user

- **Google Cloud project name?** Will need user to create the OAuth client. Walk-through is in step 5 above.
- **Domain?** Currently planning to use `allostatus.vercel.app` (default Vercel domain). User may want a custom domain — relevant for OAuth redirect URI registration.

---

## Useful references

- Next.js 16 docs: bundled at `node_modules/next/dist/docs/01-app/`
- Auth.js v5: https://authjs.dev
- Drizzle Auth adapter: https://authjs.dev/getting-started/adapters/drizzle
- Google Fitness API (deprecated, valid through 2026): https://developers.google.com/fit/rest
- Apple Health export format: https://developer.apple.com/documentation/healthkit/about_the_healthkit_framework (XML structure documented in user data exports)
