import type { EarlyWarning } from "@/lib/insight/early-warning";
import { warningColor } from "@/lib/colors";
import { SupportCard } from "./support-card";

// The check-engine light. A calm status panel that reads the *trajectory* of the
// buffer, not just today's number — steady / watch / warning — names the exact
// patterns that lit it up, and (when it's on) opens the door to support.
export function CheckEngineLight({ warning }: { warning: EarlyWarning }) {
  const color = warningColor(warning.level);
  const lit = warning.level !== "steady";

  return (
    <section className="card overflow-hidden p-7 sm:p-9">
      <div className="flex items-start gap-4 sm:gap-5">
        <StatusLight color={color} lit={lit} />

        <div className="min-w-0 flex-1">
          <p className="eyebrow">Check-engine light</p>
          <h2 className="font-display mt-1 text-2xl text-foreground sm:text-[1.75rem]">
            {warning.headline}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {warning.summary}
          </p>
        </div>
      </div>

      {warning.signals.length > 0 && (
        <ul className="mt-6 space-y-3 border-t border-border pt-6">
          {warning.signals.map((s) => (
            <li key={s.key} className="flex gap-3">
              <span
                className="mt-1.5 inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <p className="text-sm leading-relaxed text-foreground">
                <span className="font-medium">{s.label}.</span>{" "}
                <span className="text-muted">{s.detail}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {warning.daysToFloor != null && (
        <p className="mt-5 rounded-xl bg-surface-2/70 px-4 py-3 text-sm leading-relaxed text-muted">
          <span className="font-medium text-foreground">
            Predicted maintenance window:
          </span>{" "}
          if this slide continues, you&apos;d reach your low-resilience line in
          about{" "}
          <span className="font-medium text-foreground">
            {warning.daysToFloor} {warning.daysToFloor === 1 ? "day" : "days"}
          </span>
          . Acting now is far easier than recovering later.
        </p>
      )}

      {warning.calibrating && (
        <p className="mt-5 text-sm text-muted">
          Based on {warning.basisDays}{" "}
          {warning.basisDays === 1 ? "day" : "days"} so far.
        </p>
      )}

      {lit && <SupportCard />}
    </section>
  );
}

// A soft, glowing "light" — a filled dot ringed by a halo when it's on. All
// static (no looping animation), in keeping with the calm aesthetic.
function StatusLight({ color, lit }: { color: string; lit: boolean }) {
  return (
    <span
      className="relative mt-1 flex size-7 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
      aria-hidden
    >
      <span
        className="size-3.5 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: lit ? `0 0 0 4px color-mix(in srgb, ${color} 20%, transparent)` : "none",
        }}
      />
    </span>
  );
}
