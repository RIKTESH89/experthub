"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";

interface SubscriberGrowthChartProps {
  data: { date: string; count: number }[];
}

function formatDate(dateStr: unknown) {
  const date = new Date(String(dateStr));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: unknown;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-4 py-3 shadow-md">
      <p className="text-[11px] font-medium font-sans uppercase tracking-wider text-muted-foreground">
        {formatDate(label)}
      </p>
      <p className="mt-1 text-lg font-bold font-sans text-foreground">
        {payload[0].value}
      </p>
      <p className="text-[11px] font-sans text-muted-foreground">Subscribers</p>
    </div>
  );
}

export function SubscriberGrowthChart({ data }: SubscriberGrowthChartProps) {
  const latestCount = data.length > 0 ? data[data.length - 1].count : 0;

  return (
    <Card className="overflow-hidden border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold font-sans tracking-tight">Subscriber Growth</CardTitle>
          {data.length > 0 && (
            <p className="text-2xl font-bold font-sans tracking-tight text-foreground">
              {latestCount.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
          <Users className="h-5 w-5 text-emerald-500" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {data.length === 0 ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium font-sans text-muted-foreground">No subscriber data</p>
              <p className="mt-1 text-xs font-sans text-muted-foreground">
                Growth metrics will appear as subscribers join
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="subscriberAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                  <stop offset="50%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.4}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={8}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                allowDecimals={false}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={-4}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(160, 60%, 45%)"
                strokeWidth={2}
                fill="url(#subscriberAreaGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "hsl(160, 60%, 45%)",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
