import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-green-500" },
  down: { icon: TrendingDown, color: "text-red-500" },
  neutral: { icon: Minus, color: "text-muted-foreground" },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: StatCardProps) {
  return (
    <Card className="gradient-bar-top overflow-hidden transition-all duration-200 hover:scale-[1.01] hover:shadow-warm-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {trend && (() => {
              const { icon: TrendIcon, color } = trendConfig[trend.direction];
              return (
                <>
                  <TrendIcon className={cn("h-3.5 w-3.5", color)} />
                  <span className={cn("text-xs font-semibold", color)}>
                    {trend.percentage}%
                  </span>
                </>
              );
            })()}
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
