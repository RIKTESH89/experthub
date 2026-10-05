// Analytics page — will be implemented with real data when needed
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
import { Users, DollarSign, TrendingUp, Activity, Crown, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from "@/components/ui/motion";

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
    { name: "Experts", value: 342, color: "hsl(var(--chart-4))" },
    { name: "Admins", value: 12, color: "hsl(var(--chart-5))" },
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

const ROLE_LABELS = [
  { color: "hsl(var(--primary))", label: "Subscribers" },
  { color: "hsl(var(--chart-4))", label: "Experts" },
  { color: "hsl(var(--chart-5))", label: "Admins" },
];

export default function AdminAnalyticsPage() {
  const monthlyData = useMemo(() => generateMonthlyData(), []);
  const dailyEngagement = useMemo(() => generateDailyEngagement(), []);
  const roleDistribution = useMemo(() => generateRoleDistribution(), []);
  const topExperts = useMemo(() => generateTopExperts(), []);

  const latestMonth = monthlyData[monthlyData.length - 1];
  const totalUsers = roleDistribution.reduce((s, r) => s + r.value, 0);

  return (
    <PageTransition>
      <div className="space-y-8 font-sans">
        {/* Header */}
        <FadeIn delay={0}>
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-medium tracking-tight font-sans">
                  Analytics Dashboard
                </h2>
                <p className="text-sm text-muted-foreground font-sans">
                  Detailed platform metrics and performance analytics.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Overview Stats */}
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <StatCard
              title="Total Users"
              value={latestMonth.users.toLocaleString()}
              icon={Users}
              trend={{ direction: "up", percentage: 12.5 }}
              description="from last month"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Monthly Revenue"
              value={`₹${latestMonth.revenue.toLocaleString()}`}
              icon={DollarSign}
              trend={{ direction: "up", percentage: 8.2 }}
              description="from last month"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Active Subscriptions"
              value={latestMonth.subscriptions.toLocaleString()}
              icon={TrendingUp}
              trend={{ direction: "up", percentage: 5.1 }}
              description="from last month"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Daily Active Users"
              value="1,247"
              icon={Activity}
              trend={{ direction: "up", percentage: 3.8 }}
              description="from last week"
            />
          </StaggerItem>
        </StaggerContainer>

        {/* User Growth -- full width */}
        <FadeIn delay={0.15}>
          <ChartCard
            title="User Growth"
            description="Total registered users over the past year"
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
        </FadeIn>

        {/* Revenue + Daily Engagement */}
        <div className="grid gap-6 lg:grid-cols-2">
          <FadeIn delay={0.2}>
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
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </FadeIn>

          <FadeIn delay={0.25}>
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
                    <Bar dataKey="posts" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Posts" />
                    <Bar dataKey="signups" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Signups" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </FadeIn>
        </div>

        {/* Bottom Row: Distribution + Top Experts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Role Distribution */}
          <FadeIn delay={0.3}>
            <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:border-primary/20 ">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <CardHeader className="relative space-y-1.5 pb-2">
                <div className="relative flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                    <PieChartIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground font-sans">
                      User Distribution
                    </CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground font-sans">
                      Breakdown by role
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[300px] relative">
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
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        {roleDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold tracking-tight">{totalUsers.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground font-sans">Total Users</p>
                    </div>
                  </div>
                </div>
                {/* Custom legend */}
                <div className="flex items-center justify-center gap-6 pt-2 pb-1">
                  {ROLE_LABELS.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-muted-foreground font-sans">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Top Experts */}
          <FadeIn delay={0.35}>
            <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:border-primary/20 ">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-amber-400/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <CardHeader className="relative space-y-1.5 pb-2">
                <div className="relative flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                    <Crown className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground font-sans">
                      Top Experts
                    </CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground font-sans">
                      By subscriber count and revenue
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                <StaggerContainer className="space-y-2">
                  {topExperts.map((expert, i) => (
                    <StaggerItem key={expert.name}>
                      <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/30 p-3.5 transition-colors duration-200 hover:bg-muted/60 hover:border-border/70">
                        {/* Rank badge */}
                        <div
                          className={
                            i === 0
                              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white shadow-sm"
                              : i === 1
                              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted-foreground text-sm font-bold text-white shadow-sm"
                              : i === 2
                              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-700 text-sm font-bold text-white shadow-sm"
                              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                          }
                        >
                          {i + 1}
                        </div>

                        {/* Name + subscribers */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate font-sans">{expert.name}</p>
                          <p className="text-xs text-muted-foreground font-sans">
                            {expert.subscribers.toLocaleString()} subscribers
                          </p>
                        </div>

                        {/* Revenue */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            ${expert.revenue.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">
                            revenue
                          </p>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
