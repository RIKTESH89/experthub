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

interface RevenueChartProps {
  data: { date: string; amount: number }[];
}

function formatDate(dateStr: unknown) {
  const date = new Date(String(dateStr));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No revenue data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis fontSize={12} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                labelFormatter={formatDate}
                formatter={(value: unknown) => [`₹${Number(value).toFixed(2)}`, "Revenue"]}
              />
              <Bar
                dataKey="amount"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
