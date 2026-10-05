"use client";

import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter, FadeIn, motion } from "@/components/ui/motion";
import { useMemo } from "react";

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
  className?: string;
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    sparkStroke: "#10b981",
  },
  down: {
    icon: TrendingDown,
    color: "text-rose-600 dark:text-rose-400",
    sparkStroke: "#f43f5e",
  },
  neutral: {
    icon: Minus,
    color: "text-muted-foreground",
    sparkStroke: "#8b5cf6",
  },
};

/**
 * Attempt to parse a numeric value from the stat value.
 * Handles plain numbers, formatted numbers like "1,234", and prefixed values like "$1,234".
 * Returns null for shorthand strings like "1.2K" that should be displayed as-is.
 */
function parseStatValue(value: string | number): {
  numericValue: number | null;
  prefix: string;
  suffix: string;
} {
  if (typeof value === "number") {
    return { numericValue: value, prefix: "", suffix: "" };
  }

  const match = value.match(/^([^0-9]*)([0-9][0-9,]*(?:\.\d+)?)([^0-9]*)$/);
  if (match) {
    const numStr = match[2].replace(/,/g, "");
    const num = parseFloat(numStr);
    if (!isNaN(num) && Number.isFinite(num)) {
      return { numericValue: num, prefix: match[1], suffix: match[3] };
    }
  }

  return { numericValue: null, prefix: "", suffix: "" };
}

function generateSparklinePoints(direction: "up" | "down" | "neutral"): number[][] {
  const points: number[][] = [];
  const width = 120;
  const height = 32;
  const numPoints = 12;
  const xStep = width / (numPoints - 1);

  const offsets = [0.2, 0.7, 0.4, 0.9, 0.3, 0.8, 0.5, 0.6, 0.35, 0.75, 0.45, 0.65];

  for (let i = 0; i < numPoints; i++) {
    const x = i * xStep;
    const progress = i / (numPoints - 1);
    let baseY: number;

    if (direction === "up") {
      baseY = height * 0.8 - progress * height * 0.55;
    } else if (direction === "down") {
      baseY = height * 0.2 + progress * height * 0.55;
    } else {
      baseY = height * 0.5;
    }

    const jitter = (offsets[i] - 0.5) * height * 0.22;
    const y = Math.max(2, Math.min(height - 2, baseY + jitter));
    points.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  }

  return points;
}

function pointsToSmoothPath(points: number[][]): string {
  if (points.length < 2) return "";

  let d = `M ${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const prev = points[i - 1] || current;
    const afterNext = points[i + 2] || next;

    const tension = 0.3;
    const cp1x = current[0] + (next[0] - prev[0]) * tension;
    const cp1y = current[1] + (next[1] - prev[1]) * tension;
    const cp2x = next[0] - (afterNext[0] - current[0]) * tension;
    const cp2y = next[1] - (afterNext[1] - current[1]) * tension;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next[0]},${next[1]}`;
  }

  return d;
}

function Sparkline({
  direction,
  color,
  uniqueId,
}: {
  direction: "up" | "down" | "neutral";
  color: string;
  uniqueId: string;
}) {
  const width = 120;
  const height = 32;

  const { linePath, areaPath } = useMemo(() => {
    const points = generateSparklinePoints(direction);
    const line = pointsToSmoothPath(points);
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const area = `${line} L ${lastPoint[0]},${height} L ${firstPoint[0]},${height} Z`;
    return { linePath: line, areaPath: area };
  }, [direction]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className="w-full h-8"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-fill-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill={`url(#spark-fill-${uniqueId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      />
      <motion.path
        d={linePath}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
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
  className,
}: StatCardProps) {
  const trendDirection = trend?.direction ?? "neutral";
  const config = trendConfig[trendDirection];
  const resolvedSparkColor = sparkColor ?? config.sparkStroke;
  const TrendIcon = config.icon;

  const { numericValue, prefix, suffix } = parseStatValue(value);

  return (
    <FadeIn duration={0.3} direction="up">
      <Card
        className={cn(
          "relative overflow-hidden border border-border/60",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-px hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/15",
          "group",
          className
        )}
      >
        <CardContent className="relative p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-sans">
              {title}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Value + Trend */}
          <div className="flex items-baseline gap-2.5">
            {numericValue !== null ? (
              <AnimatedCounter
                value={numericValue}
                prefix={prefix}
                suffix={suffix}
                duration={1.2}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans"
              />
            ) : (
              <motion.span
                className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
              >
                {value}
              </motion.span>
            )}
            {trend && (
              <motion.span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold font-sans",
                  config.color
                )}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.2 }}
              >
                <TrendIcon className="h-3.5 w-3.5" />
                {trend.percentage}%
              </motion.span>
            )}
          </div>

          {/* Description */}
          {description && (
            <motion.p
              className="mt-1 text-[11px] text-muted-foreground font-sans"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.25 }}
            >
              {description}
            </motion.p>
          )}

          {/* Sparkline */}
          {trend && (
            <div className="mt-3 -mx-5 -mb-5 px-0">
              <Sparkline
                direction={trend.direction}
                color={resolvedSparkColor}
                uniqueId={`${title.replace(/\s/g, "-")}-${trend.direction}`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
