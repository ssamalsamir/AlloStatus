# AlloStatus

A daily **resilience-buffer** score built from wearable signals and a few
lifestyle inputs, modeled on allostatic-load indices. It deliberately doesn't
try to tell you "your resistance stage lasts X more days." Instead it shows a
**ranked breakdown of which factors are draining your buffer right now**, each
with one concrete thing you can do about it today.

The score is transparent on purpose: six factors, each compared against your own
rolling baseline, combined with literature-anchored weights. No black box.

## Run it

The app runs with **zero setup** in demo mode — with an empty `.env` it boots
against a generated 60-day history, so the whole experience (score, ranking,
trend, live sliders) works without a database or sign-in.

```bash
npm install
npm run dev        # http://localhost:3000
```

Drag the lifestyle sliders on the dashboard and watch the buffer and the ranking
recompute in real time — that's the actual scoring engine running in the browser.

### Going live (real data)

Provide a database and Google sign-in and the app switches to the persistent
experience automatically (see [`lib/config.ts`](lib/config.ts)).

```bash
# 1. Provision Neon Postgres via the Vercel Marketplace
vercel integration add neon

# 2. Generate an auth secret and add the Google OAuth client
#    (Google Cloud Console → Credentials → OAuth client ID, type Web;
#     enable the Fitness API; add the /api/auth/callback/google redirect URIs)
vercel env add AUTH_SECRET
vercel env add AUTH_GOOGLE_ID
vercel env add AUTH_GOOGLE_SECRET

# 3. Pull env, create the tables, optionally seed history
vercel env pull .env.local
npm run db:push
npm run db:seed         # 60 days of synthetic history for the newest user
```

See [`.env.example`](.env.example) for the full list.

## The score

Six factors flow into one 0–100 buffer:

| Factor | Source | Weight | Direction |
|---|---|---:|---|
| Heart-rate variability (RMSSD) | Wearable | 22% | higher is better |
| Sleep consistency | Wearable | 20% | steadier is better |
| Resting heart rate | Wearable | 18% | lower is better |
| Exercise | Self / wearable | 15% | higher is better |
| Diet quality (1–5) | Self | 15% | higher is better |
| Social support (1–5) | Self | 10% | higher is better |

Weights are anchored to the allostatic-load literature (Seeman, McEwen) and live
in one place — [`lib/scoring/weights.ts`](lib/scoring/weights.ts) — with a
citation per factor, surfaced in the app under "How this score works."

**Per factor, each day:**

```
raw value → personal z-score → direction-correct → clamp(-3, +3) → weight
```

- The z-score is against *your own* rolling 30-day baseline. Below a week of
  history it falls back to population reference ranges, and an SD floor keeps a
  steady stretch from turning a small wobble into a dramatic score.
- Sleep consistency isn't a single-night value — it's the circular spread of your
  sleep midpoint over the trailing week (so a wandering bedtime scores worse).
- Weights are renormalized over whichever factors are present, so a day with only
  self-reported inputs still uses the full range of the score.

**Composite:**

```
buffer = 100 × sigmoid( Σ weightᵢ × clamp(zᵢ, -3, +3) )
```

A sigmoid keeps it smooth and bounded — an average day for you lands near 50, a
great one pushes toward the 90s, a rough one toward single digits, no cliffs.

**Depletion ranking** answers "what's dragging the buffer down":

```
depletionᵢ = weightᵢ × max(0, zᵢ(your best day) − zᵢ(today))
```

The biggest weighted gaps between today and your best day win, because that's
where the buffer has the most to regain. The top few get a nudge from
[`lib/scoring/nudges.ts`](lib/scoring/nudges.ts).

The whole engine is pure TypeScript with no I/O, so it runs identically on the
server, in the browser, and in tests. `npm test` covers it.

## Architecture

```
Browser (Next.js)
  Dashboard: buffer ring · ranked depletion · 30-day trend · live lifestyle sliders
        │  the sliders re-run the scoring engine client-side for instant what-ifs
        ▼
Next.js 16 App Router (Vercel)
  getViewer() ─── demo? → fixed demo viewer        (lib/session.ts)
              └── real? → Auth.js v5 + Google
  loadAnalysis() ── demo? → generated history       (lib/data.ts, lib/demo)
                 └── real? → Drizzle query
        │
  lib/scoring/   pure, I/O-free engine + vitest      ← the part we iterate on
  lib/wearables/ WearableSource interface
                 ├ google-fit.ts      (REST + OAuth)
                 └ apple-health-xml.ts (export + Shortcut parser)
  /api/health/google  nightly cron pull
  /api/health/apple   export upload + iOS Shortcut ingest
        ▼
Neon Postgres (Drizzle)
  Auth.js tables · wearable_reading · lifestyle_entry · resilience_score · user_baseline
```

A few choices worth calling out:

- **Demo mode is a first-class path, not a mock.** A single seam
  (`getViewer` / `loadAnalysis`) decides between generated and real data, so the
  app is runnable from a fresh clone and every UI state is reachable without
  provisioning anything. The same generator backs `npm run db:seed`.
- **The scoring engine is isolated and pure.** It's the part we expect to tune
  most, so it has no React, no database, and no network — just data in, score
  out — which makes it cheap to test and safe to change.
- **`WearableSource` is an interface.** Every integration returns the same
  `DailyReading` shape, so swapping Google Fit for an aggregator later doesn't
  touch anything downstream.
- **`resilience_score` is a cache, not source of truth.** Change a weight, drop
  the table, recompute from the raw readings.

## Project layout

```
app/
  (auth)/login/        Google sign-in (real mode)
  api/auth/            Auth.js handlers
  api/health/google/   nightly Google Fit cron
  api/health/apple/    Apple export upload + Shortcut ingest
  dashboard/           the dashboard (Server Component)
  actions.ts           saveLifestyle Server Action
components/             buffer ring, depletion list, factor bars, trend, today panel
lib/
  scoring/             pure scoring engine (+ tests in tests/scoring)
  wearables/           WearableSource + Google Fit + Apple parsers
  demo/generate.ts     deterministic synthetic history
  config.ts            demo-vs-real detection
  session.ts           getViewer()
  data.ts              loadAnalysis()
  db/                  Drizzle schema + lazy client
scripts/seed.ts        synthetic backfill
```

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Auth.js v5 (Google) · Drizzle ORM + Neon Postgres · Zod · Vitest.

## Notes

- **Apple Health has no web API.** The Apple path is a user-uploaded `export.xml`
  plus an optional iOS Shortcut that POSTs daily JSON to a per-user token. A
  native companion is out of scope for v1.
- **Google Fit's REST API is deprecated** (sunsets 2026) and never exposed RMSSD
  HRV. That's exactly why the wearable layer is behind an interface — the Apple
  path or an aggregator covers HRV without changes elsewhere.
