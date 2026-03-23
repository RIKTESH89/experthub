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

interface SubscriberGrowthChartProps {
  data: { date: string; count: number }[];
}

function formatDate(dateStr: unknown) {
  const date = new Date(String(dateStr));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SubscriberGrowthChart({ data }: SubscriberGrowthChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriber Growth</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No subscriber data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip
                labelFormatter={formatDate}
                formatter={(value: unknown) => [String(value), "Subscribers"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
