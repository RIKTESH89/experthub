"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartCard } from "@/components/dashboard/chart-card";

// Mock data generators
function generateUserGrowthData() {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  let total = 120;
  return months.map((month) => {
    total += Math.floor(Math.random() * 80) + 20;
    return { month, users: total };
  });
}

function generatePostsPerDayData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({
    day,
    posts: Math.floor(Math.random() * 50) + 10,
  }));
}

function generateRevenueData() {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  let revenue = 2000;
  return months.map((month) => {
    revenue += Math.floor(Math.random() * 1500) + 500;
    return { month, revenue };
  });
}

export function AnalyticsOverview() {
  const userGrowthData = useMemo(() => generateUserGrowthData(), []);
  const postsPerDayData = useMemo(() => generatePostsPerDayData(), []);
  const revenueData = useMemo(() => generateRevenueData(), []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* User Growth */}
      <ChartCard
        title="User Growth"
        description="Total registered users over the past year"
        className="lg:col-span-2"
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userGrowthData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Posts Per Day */}
      <ChartCard
        title="Posts Per Day"
        description="Average posts published this week"
      >
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={postsPerDayData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="day"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar
                dataKey="posts"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Subscription Revenue */}
      <ChartCard
        title="Subscription Revenue"
        description="Monthly recurring revenue"
      >
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value) => [
                  `₹${Number(value).toLocaleString()}`,
                  "Revenue",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
