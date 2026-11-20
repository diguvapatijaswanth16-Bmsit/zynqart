import { scoreTone, cn } from "@/lib/utils";

export function MatchRing({
  score,
  size = 56,
  showLabel = false,
  className,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        className="relative grid place-items-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${score}% match — ${tone.label}`}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        </svg>
        <span className="absolute font-display text-[11px] font-semibold tabular-nums" style={{ fontSize: size / 4.6 }}>
          {score}%
        </span>
      </div>
      {showLabel ? (
        <div className="text-xs">
          <p className="font-medium text-foreground">Match score</p>
          <p className={cn("text-[11px]", tone.className)}>{tone.label}</p>
        </div>
      ) : null}
    </div>
  );
}
