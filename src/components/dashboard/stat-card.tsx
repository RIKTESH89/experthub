import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    direction: "up" | "down" | "neutral";
    percentage: number;
  };
  sparkColor?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-500/10", border: "border-green-500/20" },
  down: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/20" },
  neutral: { icon: Minus, color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
};

function generateSparklinePoints(direction: "up" | "down" | "neutral"): string {
  const points: [number, number][] = [];
  const xStep = 80 / 6; // 7 points across 80px viewBox width

  // Seed-like deterministic pseudo-random offsets for visual variety
  const offsets = [0.2, 0.7, 0.4, 0.9, 0.3, 0.8, 0.5];

  for (let i = 0; i < 7; i++) {
    const x = i * xStep;
    const progress = i / 6;
    let baseY: number;

    if (direction === "up") {
      // Trend downward in Y (lower Y = higher visually)
      baseY = 20 - progress * 14;
    } else if (direction === "down") {
      // Trend upward in Y (higher Y = lower visually)
      baseY = 6 + progress * 14;
    } else {
      // Flat around middle
      baseY = 12;
    }

    // Add jitter for organic feel
    const jitter = (offsets[i] - 0.5) * 6;
    const y = Math.max(2, Math.min(22, baseY + jitter));
    points.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  }

  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function Sparkline({ direction, color }: { direction: "up" | "down" | "neutral"; color: string }) {
  const points = generateSparklinePoints(direction);

  return (
    <svg
      viewBox="0 0 80 24"
      fill="none"
      className="w-full h-6"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Gradient fill under the line */}
      <defs>
        <linearGradient id={`spark-grad-${direction}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polyline
        points={`0,24 ${points} 80,24`}
        fill={`url(#spark-grad-${direction})`}
      />
      {/* Line */}
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  sparkColor,
}: StatCardProps) {
  const resolvedSparkColor = sparkColor
    ?? (trend?.direction === "up" ? "#22c55e" : trend?.direction === "down" ? "#ef4444" : "#8b5cf6");

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-warm-md group">
      <CardContent className="p-4">
        {/* Header: icon + title */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </span>
        </div>

        {/* Value row */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {trend && (() => {
            const { icon: TrendIcon, color, bg, border } = trendConfig[trend.direction];
            return (
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold border",
                color, bg, border
              )}>
                <TrendIcon className="h-3 w-3" />
                {trend.percentage}%
              </span>
            );
          })()}
        </div>

        {/* Description */}
        {description && (
          <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
            {description}
          </p>
        )}

        {/* Sparkline */}
        {trend && (
          <div className="mt-3 -mx-4 -mb-4 px-0">
            <Sparkline direction={trend.direction} color={resolvedSparkColor} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
