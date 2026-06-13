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
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">AlloStatus</h1>
          <p className="text-sm text-muted">
            {signedIn ? viewer!.email : "Sample data — sign in to track your own"}
          </p>
        </div>
        {signedIn ? (
          <form
            action={async () => {
              "use server";
              const { signOut } = await import("@/auth");
              await signOut({ redirectTo: "/dashboard" });
            }}
          >
            <button type="submit" className="text-sm text-muted transition hover:text-foreground">
              Sign out
            </button>
          </form>
        ) : (
          <a
            href="/login"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Sign in
          </a>
        )}
      </header>

      <TodayPanel
        baselines={analysis.baselines}
        inputsToday={analysis.inputsToday}
        best30={analysis.best30?.bufferPct ?? null}
        isDemo={!signedIn}
      />

      <section className="mt-5 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            Last 30 days
          </h2>
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
  );
}

function ConnectionsNote({ isDemo }: { isDemo: boolean }) {
  const sources = [
    { name: "Google Fit", detail: "HRV, sleep & resting HR, pulled nightly" },
    { name: "Apple Health", detail: "Export upload or a daily iOS Shortcut" },
  ];
  return (
    <section className="mt-5 grid gap-3 sm:grid-cols-2">
      {sources.map((src) => (
        <div key={src.name} className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{src.name}</h3>
            <span className="text-xs text-muted">
              {isDemo ? "Sample data" : "Not connected"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{src.detail}</p>
        </div>
      ))}
    </section>
  );
}

function Methodology() {
  return (
    <details className="mt-5 rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <summary className="cursor-pointer text-sm font-medium uppercase tracking-wider text-muted">
        How this score works
      </summary>
      <p className="mt-4 text-sm text-muted leading-relaxed">
        Each factor is compared against your own rolling 30-day baseline, capped
        so one bad reading can&apos;t dominate, then combined with these
        literature-anchored weights into a 0–100 buffer. The weights are the
        whole model — no black box.
      </p>
      <ul className="mt-4 space-y-2.5">
        {FACTORS.map((f) => (
          <li key={f.key} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{f.label}</span>
              <span className="tabular-nums text-muted">{Math.round(f.weight * 100)}%</span>
            </div>
            <p className="text-xs text-muted">{f.citation}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
