// The AlloStatus mark: a miniature of the dashboard's buffer ring — an open
// dial with a rounded progress sweep — so the logo *is* the product's central
// image at small size. Inherits `currentColor`, so colour comes from CSS.
export function Logo({ className }: { className?: string }) {
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const progress = 0.72; // a dial caught partway — alive, not full or empty

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <g transform="rotate(-90 12 12)">
        <circle
          cx="12"
          cy="12"
          r={r}
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="2.4"
        />
        <circle
          cx="12"
          cy="12"
          r={r}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray={`${(circumference * progress).toFixed(2)} ${circumference.toFixed(2)}`}
        />
      </g>
    </svg>
  );
}
