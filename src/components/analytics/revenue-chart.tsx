"use client";

import {
  BarChart,
  Bar,
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
import { TrendingUp } from "lucide-react";

interface RevenueChartProps {
  data: { date: string; amount: number }[];
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
        ₹{payload[0].value.toFixed(2)}
      </p>
      <p className="text-[11px] font-sans text-muted-foreground">Revenue</p>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  const totalRevenue = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card className="overflow-hidden border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold font-sans tracking-tight">Revenue</CardTitle>
          {data.length > 0 && (
            <p className="text-2xl font-bold font-sans tracking-tight text-foreground">
              ₹{totalRevenue.toFixed(2)}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700/10">
          <TrendingUp className="h-5 w-5 text-blue-700 dark:text-blue-400" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {data.length === 0 ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card">
              <TrendingUp className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium font-sans text-muted-foreground">No revenue data</p>
              <p className="mt-1 text-xs font-sans text-muted-foreground">
                Revenue will appear here once transactions are recorded
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barCategoryGap="20%">
              <defs>
                <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E40AF" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.6} />
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
                fontSize={11}
                tickFormatter={(v) => `₹${v}`}
                tickLine={false}
                axisLine={false}
                dx={-4}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3, radius: 8 }}
              />
              <Bar
                dataKey="amount"
                fill="url(#revenueBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
