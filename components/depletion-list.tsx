import type { Depletor } from "@/lib/scoring/types";
import { severityColor } from "@/lib/colors";

const SEVERITY_LABEL: Record<Depletor["severity"], string> = {
  high: "Pulling hard",
  moderate: "Below your norm",
  mild: "Slightly down",
};

// The product's whole point: not a single number, but a ranked, explained list
// of what's draining the buffer right now and one concrete thing to do about it.
export function DepletionList({ depletors }: { depletors: Depletor[] }) {
  if (depletors.length === 0) {
    return (
      <p className="text-sm text-muted leading-relaxed">
        Nothing is dragging your buffer down today — you&apos;re at or above your
        own baseline across every factor. Keep doing what you&apos;re doing.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {depletors.map((d, i) => (
        <li key={d.key} className="flex gap-3.5">
          <span
            className="mt-1 inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: severityColor(d.severity) }}
            aria-hidden
          />
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[0.7rem] font-medium text-muted tabular-nums">
                {i + 1}
              </span>
              <h3 className="font-medium leading-none">{d.label}</h3>
              <span
                className="text-[0.7rem] font-medium"
                style={{ color: severityColor(d.severity) }}
              >
                {SEVERITY_LABEL[d.severity]}
              </span>
            </div>
            <p className="text-sm text-muted leading-relaxed">{d.nudge}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
