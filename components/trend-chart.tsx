import { scoreColor, scoreLabel } from "@/lib/colors";
import { formatDate } from "@/lib/format";

const W = 640;
const H = 200;
const PAD_L = 30; // gutter for the y-axis labels
const PAD_R = 46; // room for the end-of-line value chip
const PAD_Y = 18;

// A plain SVG line chart — no charting dependency, which keeps the bundle small
// and the markup readable. The aim is that someone reads it in a glance: the
// labelled 0–100 axis says how high is good, the gridlines give the scale, the
// dashed line is "an average day for you," and the dot at the end is today,
// with its value called out. Higher is more resilience.
export function TrendChart({
  trend,
  best,
}: {
  trend: { date: string; bufferPct: number }[];
  best?: { date: string; bufferPct: number } | null;
}) {
  if (trend.length === 0) {
    return <p className="text-sm text-muted">No history yet.</p>;
  }

  const n = trend.length;
  const plotW = W - PAD_L - PAD_R;
  const x = (i: number) => (n === 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW);
  const y = (pct: number) => PAD_Y + (1 - pct / 100) * (H - 2 * PAD_Y);

  const points = trend.map((p, i) => `${x(i).toFixed(1)},${y(p.bufferPct).toFixed(1)}`);
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L ${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  const today = trend[n - 1];
  const color = scoreColor(today.bufferPct);
  const bestIdx = best ? trend.findIndex((p) => p.date === best.date) : -1;

  const gridlines = [100, 75, 50, 25, 0];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Reference grid + y-axis scale, so the height of the line means something. */}
        {gridlines.map((pct) => (
          <g key={pct}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(pct)}
              y2={y(pct)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeOpacity={pct === 50 ? 0 : 0.5}
            />
            <text
              x={PAD_L - 7}
              y={y(pct)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill="var(--muted)"
            >
              {pct}
            </text>
          </g>
        ))}

        {/* "An average day for you" — the line everything is read against. */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={y(50)}
          y2={y(50)}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <text
          x={W - PAD_R + 4}
          y={y(50)}
          dominantBaseline="middle"
          fontSize="10"
          fill="var(--muted)"
        >
          avg
        </text>

        <path d={area} fill="url(#trend-fill)" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Your best day in the window — a hollow marker, so "best NN" has a place. */}
        {bestIdx >= 0 && bestIdx !== n - 1 && (
          <circle
            cx={x(bestIdx)}
            cy={y(best!.bufferPct)}
            r="3.5"
            fill="var(--background)"
            stroke="var(--muted)"
            strokeWidth="1.5"
          />
        )}

        {/* Today — the point the eye should land on, with its value called out. */}
        <circle cx={x(n - 1)} cy={y(today.bufferPct)} r="6" fill="var(--background)" />
        <circle cx={x(n - 1)} cy={y(today.bufferPct)} r="4" fill={color} />
        <text
          x={x(n - 1)}
          y={y(today.bufferPct) - 11}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill={color}
        >
          {Math.round(today.bufferPct)}
        </text>
      </svg>

      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span>{formatDate(trend[0].date)}</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full" style={{ background: color }} aria-hidden />
          today · {scoreLabel(today.bufferPct).toLowerCase()}
        </span>
      </div>
    </div>
  );
}
