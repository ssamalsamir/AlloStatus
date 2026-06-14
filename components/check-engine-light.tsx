import type { EarlyWarning, WarningLevel } from "@/lib/insight/early-warning";
import type { ScoreBand } from "@/lib/colors";
import { SupportCard } from "./support-card";

// The check-engine light. A calm status panel that reads the *trajectory* of the
// buffer, not just today's number — steady / watch / warning — names the exact
// patterns that lit it up, and (when it's on) opens the door to support.
//
// Colour is supplied by the caller so it matches the buffer dial (the score
// ramp); the *level* is still legible without colour, via the glyph and halo.
export function CheckEngineLight({
  warning,
  color,
  band,
}: {
  warning: EarlyWarning;
  color: string;
  band: ScoreBand;
}) {
  // A red buffer is "at risk" outright: a score in the low band is itself the
  // alarm, regardless of where the trend is heading — you can already be low and
  // not currently sliding. So the red band overrides the trajectory headline and
  // shows the light at full severity; amber and green keep the trajectory read.
  const atRisk = band === "low";
  const level: WarningLevel = atRisk ? "warning" : warning.level;
  const lit = atRisk || warning.level !== "steady";
  const headline = atRisk ? "At risk" : warning.headline;
  const summary = atRisk ? AT_RISK_SUMMARY : warning.summary;

  return (
    <section className="card overflow-hidden p-5 sm:p-7">
      <div className="flex items-start gap-4 sm:gap-5">
        <StatusLight level={level} color={color} />

        <div className="min-w-0 flex-1">
          <p className="eyebrow">Check-engine light</p>
          <h2 className="font-display mt-1 text-2xl text-foreground sm:text-[1.75rem]">
            {headline}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {summary}
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

const AT_RISK_SUMMARY =
  "Your buffer has dropped into the low band — this is where strain starts to break things. Whatever the trend is doing, treat today as one to ease off and lean on support; recovering gets harder the longer it sits here.";

// The light reads differently at each level — by glyph *and* by halo, not colour
// alone, so the state is legible even without colour (and to a colour-blind eye):
//   steady  → a calm check, flat, no halo
//   watch   → an eye, a single soft ring (we're keeping an eye on it)
//   warning → an alert mark, a stronger double ring
// All static — no looping animation — in keeping with the calm aesthetic.
function StatusLight({ level, color }: { level: WarningLevel; color: string }) {
  const tint = (pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  const halo =
    level === "warning"
      ? `0 0 0 4px ${tint(18)}, 0 0 0 9px ${tint(8)}`
      : level === "watch"
        ? `0 0 0 4px ${tint(16)}`
        : "none";

  return (
    <span
      className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: tint(14), boxShadow: halo }}
      aria-hidden
    >
      <LevelGlyph level={level} color={color} />
    </span>
  );
}

function LevelGlyph({ level, color }: { level: WarningLevel; color: string }) {
  const props = {
    className: "size-[18px]",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (level === "steady") {
    // check
    return (
      <svg {...props}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }

  if (level === "watch") {
    // eye
    return (
      <svg {...props}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    );
  }

  // warning — alert mark
  return (
    <svg {...props}>
      <path d="M12 7.5v5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}
