"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function generateMonthlyData() {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  let users = 150;
  let revenue = 3000;
  return months.map((month) => {
    users += Math.floor(Math.random() * 100) + 30;
    revenue += Math.floor(Math.random() * 2000) + 500;
    return {
      month,
      users,
      revenue,
      subscriptions: Math.floor(users * 0.35),
      posts: Math.floor(Math.random() * 120) + 40,
    };
  });
}

function generateDailyEngagement() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({
    day,
    chats: Math.floor(Math.random() * 500) + 100,
    posts: Math.floor(Math.random() * 80) + 20,
    signups: Math.floor(Math.random() * 40) + 5,
  }));
}

function generateRoleDistribution() {
  return [
    { name: "Subscribers", value: 2847, color: "hsl(var(--primary))" },
    { name: "Experts", value: 342, color: "hsl(262, 83%, 68%)" },
    { name: "Admins", value: 12, color: "hsl(262, 83%, 78%)" },
  ];
}

function generateTopExperts() {
  return [
    { name: "Dr. Sarah Chen", subscribers: 1250, revenue: 18750 },
    { name: "Alex Rivera", subscribers: 980, revenue: 14700 },
    { name: "Maya Patel", subscribers: 845, revenue: 12675 },
    { name: "James Wilson", subscribers: 720, revenue: 10800 },
    { name: "Lisa Park", subscribers: 615, revenue: 9225 },
  ];
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

export default function AdminAnalyticsPage() {
  const monthlyData = useMemo(() => generateMonthlyData(), []);
  const dailyEngagement = useMemo(() => generateDailyEngagement(), []);
  const roleDistribution = useMemo(() => generateRoleDistribution(), []);
  const topExperts = useMemo(() => generateTopExperts(), []);

  const latestMonth = monthlyData[monthlyData.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Analytics Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Detailed platform metrics and performance analytics.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={latestMonth.users.toLocaleString()}
          icon={Users}
          trend={{ direction: "up", percentage: 12.5 }}
          description="from last month"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${latestMonth.revenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ direction: "up", percentage: 8.2 }}
          description="from last month"
        />
        <StatCard
          title="Active Subscriptions"
          value={latestMonth.subscriptions.toLocaleString()}
          icon={TrendingUp}
          trend={{ direction: "up", percentage: 5.1 }}
          description="from last month"
        />
        <StatCard
          title="Daily Active Users"
          value="1,247"
          icon={Activity}
          trend={{ direction: "up", percentage: 3.8 }}
          description="from last week"
        />
      </div>

      {/* User Growth + Revenue */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="User Growth"
          description="Total registered users over the past year"
          className="lg:col-span-2"
        >
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#userGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Revenue Trend" description="Monthly recurring revenue">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Engagement" description="Activity breakdown this week">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyEngagement}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="chats" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Chats" />
                <Bar dataKey="posts" fill="hsl(262, 83%, 68%)" radius={[4, 4, 0, 0]} name="Posts" />
                <Bar dataKey="signups" fill="hsl(262, 83%, 78%)" radius={[4, 4, 0, 0]} name="Signups" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role Distribution */}
        <ChartCard title="User Distribution" description="Breakdown by role">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {roleDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Top Experts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Experts</CardTitle>
            <CardDescription>By subscriber count and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topExperts.map((expert, i) => (
                <div key={expert.name} className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{expert.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {expert.subscribers.toLocaleString()} subscribers
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      ${expert.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
