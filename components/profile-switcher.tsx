import { DEMO_PROFILES } from "@/lib/demo/profiles";

// Plain links, not client state — switching a profile just re-requests the page
// with ?profile=<id>, and the server renders that persona. Keeps the whole thing
// shareable (each profile has its own URL) and JS-free.
export function ProfileSwitcher({ activeId }: { activeId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {DEMO_PROFILES.map((p) => {
        const active = p.id === activeId;
        return (
          <a
            key={p.id}
            href={`/dashboard?profile=${p.id}`}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white shadow-sm"
                : "rounded-full bg-surface px-4 py-1.5 text-sm text-muted ring-1 ring-border transition hover:text-foreground"
            }
          >
            {p.name}
          </a>
        );
      })}
    </div>
  );
}
