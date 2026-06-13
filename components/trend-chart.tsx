import { scoreColor } from "@/lib/colors";
import { formatDate } from "@/lib/format";

const W = 600;
const H = 170;
const PAD_X = 6;
const PAD_Y = 16;

// A plain SVG sparkline — no charting dependency, which keeps the bundle small
// and the markup readable. The dashed line at the halfway mark is "an average
// day for you," so the shape reads as time spent above or below your own normal.
export function TrendChart({ trend }: { trend: { date: string; bufferPct: number }[] }) {
  if (trend.length === 0) {
    return <p className="text-sm text-muted">No history yet.</p>;
  }

  const n = trend.length;
  const x = (i: number) => (n === 1 ? W / 2 : PAD_X + (i / (n - 1)) * (W - 2 * PAD_X));
  const y = (pct: number) => PAD_Y + (1 - pct / 100) * (H - 2 * PAD_Y);

  const points = trend.map((p, i) => `${x(i).toFixed(1)},${y(p.bufferPct).toFixed(1)}`);
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${x(n - 1).toFixed(1)},${H} L ${x(0).toFixed(1)},${H} Z`;

  const today = trend[n - 1];
  const color = scoreColor(today.bufferPct);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: H }}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          x2={W}
          y1={y(50)}
          y2={y(50)}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        <path d={area} fill="url(#trend-fill)" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={x(n - 1)}
          x2={x(n - 1)}
          y1={PAD_Y}
          y2={H - PAD_Y}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{formatDate(trend[0].date)}</span>
        <span>today</span>
      </div>
    </div>
  );
}
