import { getViewer } from "@/lib/session";
import { loadAnalysis } from "@/lib/data";
import { FACTORS } from "@/lib/scoring";
import { TodayPanel } from "@/components/today-panel";
import { TrendChart } from "@/components/trend-chart";

export default async function DashboardPage() {
  const viewer = await getViewer();
  const signedIn = !!viewer && !viewer.isDemo;
  const analysis = await loadAnalysis(viewer);

  return (
    <div className="flex-1">
      <SiteHeader signedIn={signedIn} email={signedIn ? viewer!.email : null} />

      <main className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-6">
        {/* Editorial intro — sets the calm, plain-spoken tone before the data. */}
        <section className="py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-2">
            {signedIn ? "Your daily reading" : "Sample reading"}
          </p>
          <h1 className="font-display mt-3 text-4xl leading-[1.1] text-foreground sm:text-5xl">
            How much can you
            <br />
            <span className="italic">carry today?</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            A daily resilience buffer drawn from your wearables and a few
            lifestyle inputs — and a ranked, plain-language breakdown of what is
            quietly draining it right now.
          </p>
        </section>

        <TodayPanel
          baselines={analysis.baselines}
          inputsToday={analysis.inputsToday}
          best30={analysis.best30?.bufferPct ?? null}
          isDemo={!signedIn}
        />

        <section className="card mt-5 p-7 sm:p-9">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="eyebrow">Last 30 days</h2>
            {analysis.best30 && (
              <span className="text-xs text-muted">
                best {Math.round(analysis.best30.bufferPct)}
              </span>
            )}
          </div>
          <TrendChart trend={analysis.trend} />
        </section>

        <ConnectionsNote isDemo={!signedIn} />
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
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4 sm:px-6">
        <a href="/dashboard" className="flex items-center gap-2.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: "var(--accent)" }}
            aria-hidden
          />
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
    { name: "Apple Health", detail: "Export upload or a daily iOS Shortcut" },
  ];
  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2">
      {sources.map((src) => (
        <div key={src.name} className="card p-6">
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

function Methodology() {
  return (
    <details className="card mt-5 p-7 sm:p-9">
      <summary className="eyebrow cursor-pointer list-none">
        How this score works
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
