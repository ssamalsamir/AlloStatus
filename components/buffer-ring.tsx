import type { CSSProperties } from "react";
import { clamp } from "@/lib/scoring/stats";
import { scoreColor } from "@/lib/colors";

// The number is always the real value — no animation can show the wrong score.
// The ring sweeps in once via a CSS keyframe (from empty to the target offset)
// and glides on later changes via a transition, so dragging the live sliders
// animates it too. All CSS, so there's nothing to hydrate.
export function BufferRing({
  value,
  size = 208,
  stroke = 14,
  color,
}: {
  value: number;
  size?: number;
  stroke?: number;
  /** Override the ring/number colour. Defaults to the green resilience ramp;
   *  the dashboard passes the check-engine light's colour so the two agree. */
  color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamp(value, 0, 100) / 100);
  const ringColor = color ?? scoreColor(value);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Resilience buffer ${Math.round(value)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          className="buffer-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={
            { "--ring-circ": `${circumference}px`, strokeDashoffset: `${offset}px` } as CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-semibold tabular-nums tracking-tight"
          style={{ color: ringColor }}
        >
          {Math.round(value)}
        </span>
        <span className="text-xs uppercase tracking-wider text-muted">buffer</span>
      </div>
    </div>
  );
}
