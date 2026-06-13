import type { FactorScore } from "@/lib/scoring/types";
import { NEG, POS } from "@/lib/colors";
import { formatFactorValue } from "@/lib/format";
import { clamp } from "@/lib/scoring/stats";

// A diverging bar per factor, centred on "your normal". It grows right and green
// when a factor is helping today, left and red when it's a drag — the
// transparency behind the single buffer number.
export function FactorBars({ factors }: { factors: FactorScore[] }) {
  return (
    <ul className="space-y-3">
      {factors.map((f) => {
        const magnitude = clamp(Math.abs(f.goodnessZ) / 3, 0, 1) * 50; // % of half-width
        const positive = f.goodnessZ >= 0;
        const color = positive ? POS : NEG;

        return (
          <li key={f.key} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3">
            <span className="text-sm text-muted truncate">{f.label}</span>

            <div className="relative h-2 rounded-full bg-surface-2">
              <span className="absolute inset-y-0 left-1/2 w-px bg-border" aria-hidden />
              {f.present && (
                <span
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    backgroundColor: color,
                    width: `${magnitude}%`,
                    left: positive ? "50%" : `${50 - magnitude}%`,
                  }}
                />
              )}
            </div>

            <span className="text-sm tabular-nums text-right">
              {formatFactorValue(f.key, f.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
