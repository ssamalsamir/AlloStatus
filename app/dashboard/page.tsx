import type { ReactNode } from "react";
import { getViewer } from "@/lib/session";
import { loadAnalysis } from "@/lib/data";
import { FACTORS } from "@/lib/scoring";
import { scoreLabel } from "@/lib/colors";
import { DashboardEventsShell } from "@/components/dashboard-events-shell";
import { LiveReading } from "@/components/live-reading";
import { loadTrendEvents } from "@/lib/events/data";
import type { TrendEvent } from "@/lib/events/types";
import { SamplePuller } from "@/components/sample-puller";
import { Logo } from "@/components/logo";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const signedIn = !!viewer && !viewer.isDemo;
  const demo = !signedIn;

  const rawSeed = (await searchParams).seed;
  const hasSeed = typeof rawSeed === "string" && /^\d+$/.test(rawSeed);
  const seed = hasSeed ? Number(rawSeed) : undefined;

  // The landing starts blank: a logged-out visitor who hasn't generated a sample
  // sees the pitch and a way in — never a reading we pulled up for them. A sample
  // appears only once they generate one (which rolls a random ?seed=, see
  // SamplePuller) or sign in for their own data.
  if (demo && !hasSeed) {
    return <EmptyLanding />;
  }

  const analysis = await loadAnalysis(viewer, demo ? seed : undefined);
  const events: TrendEvent[] =
    signedIn && viewer ? await loadTrendEvents(viewer.id) : [];

  const topDepletor = analysis.today.depletors[0]?.label;
  const sampleLine = `This sample reads ${scoreLabel(analysis.today.bufferPct)}${
    topDepletor
      ? `, with ${topDepletor.toLowerCase()} leading the drag`
      : " with little dragging it"
  }. Pull another for a different week.`;

  return (
    <DashboardEventsShell initialEvents={events} isDemo={demo} demoSeed={seed}>
      <div className="flex-1">
        <SiteHeader signedIn={signedIn} email={signedIn ? viewer!.email : null} />

        <main className="mx-auto w-full max-w-5xl px-5 pb-14 sm:px-6">
          {/* Editorial intro — sets the calm, plain-spoken tone before the data. */}
          <EditorialIntro eyebrow={demo ? "Sample reading" : "Your daily reading"}>
            {demo && (
              <div className="mt-8 space-y-3">
                <SamplePuller />
                <p className="max-w-xl text-sm text-muted">{sampleLine}</p>
              </div>
            )}
          </EditorialIntro>

          <HowItWorks />

          {/* The live reading: dragging a slider re-scores in the browser, which
              re-colours the check-engine light, the buffer dial and the trend
              together — while tagged events drive the warning level and feed the
              chat. One component owns both so everything stays in sync. */}
          <LiveReading analysis={analysis} isDemo={!signedIn} />

          <ConnectionsNote isDemo={!signedIn} />
          <Methodology />
        </main>
      </div>
    </DashboardEventsShell>
  );
}

// Shared editorial header (eyebrow + headline + pitch). The reading and the
// blank landing both open with it; `children` carries whatever call-to-action
// belongs underneath.
function EditorialIntro({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children?: ReactNode;
}) {
  return (
    <section className="py-8 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-2">
        {eyebrow}
      </p>
      <h1 className="font-display mt-3 text-4xl leading-[1.1] text-foreground sm:text-5xl">
        A check-engine light
        <br />
        <span className="italic">for burnout.</span>
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
        Run at 100% for long enough and something breaks. AlloStatus tracks a
        daily resilience buffer from your wearables and lifestyle, and lights up
        early — when the trend starts sliding — so you can ease off before you
        hit a wall, not after.
      </p>
      {children}
    </section>
  );
}

// The logged-out landing before any sample exists: the pitch and a way in
// (generate a demo reading, or sign in), but no reading pulled up for them.
function EmptyLanding() {
  return (
    <div className="flex-1">
      <SiteHeader signedIn={false} email={null} />

      <main className="mx-auto w-full max-w-5xl px-5 pb-14 sm:px-6">
        <EditorialIntro eyebrow="Demo">
          <div className="mt-8 space-y-3">
            <SamplePuller label="Generate a demo sample" />
            <p className="max-w-xl text-sm text-muted">
              Nothing pulled up yet. Generate a sample to explore the dashboard
              with synthetic data, or{" "}
              <a
                href="/login"
                className="text-foreground underline underline-offset-4"
              >
                sign in
              </a>{" "}
              to connect your own wearables.
            </p>
          </div>
        </EditorialIntro>

        <HowItWorks />
        <Methodology />
      </main>
    </div>
  );
}

function SiteHeader({
  signedIn,
  email,
}: {
  signedIn: boolean;
  email: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
        <a href="/dashboard" className="flex items-center gap-2.5">
          <Logo className="size-[22px] text-[color:var(--accent)]" />
          <span className="font-display text-lg tracking-tight">AlloStatus</span>
        </a>
        {signedIn ? (
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted sm:inline">{email}</span>
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut({ redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-muted transition hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <a href="/login" className="btn-primary px-5 py-2 text-sm">
            Sign in
          </a>
        )}
      </div>
    </header>
  );
}

function ConnectionsNote({ isDemo }: { isDemo: boolean }) {
  const sources = [
    { name: "Google Fit", detail: "HRV, sleep & resting HR, pulled nightly" },
  ];
  return (
    <section className="mt-4 grid gap-4">
      {sources.map((src) => (
        <div key={src.name} className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">{src.name}</h3>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
              {isDemo ? "Sample data" : "Not connected"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{src.detail}</p>
        </div>
      ))}
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Read your signals",
      body: "Wearables feed HRV, sleep timing and resting heart rate; you log diet, social connection and exercise — six factors in all.",
    },
    {
      title: "Compare to your own normal",
      body: "Each factor is scored against your rolling 30-day baseline, so “good” means good for you — not a population average.",
    },
    {
      title: "One resilience buffer",
      body: "The six combine into a single 0–100 score, with the factors draining it most ranked so you know exactly where to act.",
    },
    {
      title: "Caught early",
      body: "The check-engine light watches the trend, not just today, and lights up while a slide is still easy to reverse.",
    },
  ];

  return (
    <section className="card mt-4 p-5 sm:p-7">
      <h2 className="eyebrow mb-1">How it works</h2>
      <p className="font-display mb-6 text-2xl text-foreground">
        From raw signals to one honest number.
      </p>
      <ol className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums"
              style={{
                color: "var(--accent)",
                backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
              }}
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Methodology() {
  return (
    <details className="card group mt-4 p-5 sm:p-7">
      <summary className="eyebrow flex cursor-pointer list-none items-center justify-between gap-3">
        The weights, in full
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Each factor is compared against your own rolling 30-day baseline, capped
        so one bad reading can&apos;t dominate, then combined with these
        literature-anchored weights into a 0–100 buffer. The weights are the
        whole model — no black box.
      </p>
      <ul className="mt-5 space-y-3">
        {FACTORS.map((f) => (
          <li key={f.key} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{f.label}</span>
              <span className="tabular-nums text-muted">
                {Math.round(f.weight * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted">{f.citation}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
