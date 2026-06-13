import { SUPPORT_RESOURCES } from "@/lib/support";

// The "support before the breaking point" half of the brief. It only renders
// when the early-warning light is on, so reaching for help is offered exactly
// when it's most useful — never as a permanent fixture that fades into wallpaper.
export function SupportCard() {
  return (
    <div className="mt-6 rounded-2xl bg-surface-2/70 p-5 sm:p-6">
      <h3 className="font-display text-lg text-foreground">
        If today feels heavy, reach out
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        AlloStatus is an early-warning and support tool, not a diagnosis. These
        connect you with people who can help — talking to someone early is the
        whole point.
      </p>

      <ul className="mt-4 space-y-3">
        {SUPPORT_RESOURCES.map((r) => (
          <li
            key={r.name}
            className="rounded-xl bg-surface p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-medium text-foreground">{r.name}</span>
              {r.href ? (
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-accent underline decoration-accent/30 underline-offset-2 transition hover:decoration-accent"
                >
                  {r.action}
                </a>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  {r.action}
                </span>
              )}
            </div>
            {r.note && (
              <p className="mt-1 text-xs leading-relaxed text-muted">{r.note}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
