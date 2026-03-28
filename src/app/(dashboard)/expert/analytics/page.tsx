"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, UserCheck, DollarSign, MessageSquare, BarChart3, Activity, Sparkles } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import { SubscriberGrowthChart } from "@/components/analytics/subscriber-growth-chart";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { ContentPerformanceTable } from "@/components/analytics/content-performance-table";
import { PopularQuestionsList } from "@/components/analytics/popular-questions-list";
import { TopicGapsCard } from "@/components/analytics/topic-gaps-card";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from "@/components/ui/motion";

interface AnalyticsData {
  overview: {
    totalSubscribers: number;
    activeSubscribers: number;
    totalRevenue: number;
    periodRevenue: number;
    totalTwinQuestions: number;
    periodTwinQuestions: number;
    avgAnswerQuality: number;
  };
  subscriberGrowth: { date: string; count: number }[];
  revenueOverTime: { date: string; amount: number }[];
  twinUsage: { date: string; questions: number }[];
  contentPerformance: {
    id: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    createdAt: string;
  }[];
}

interface QuestionsData {
  questions: {
    question: string;
    answerQuality: number | null;
    topicCategory: string | null;
    sourcesUsed: number;
    createdAt: string;
  }[];
}

interface TopicGapsData {
  gaps: {
    topic: string;
    questionCount: number;
    avgQuality: number;
    sampleQuestions: string[];
  }[];
}

function formatDate(dateStr: unknown) {
  const date = new Date(String(dateStr));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
      <Skeleton className="h-[380px] rounded-xl" />
      <Skeleton className="h-[400px] rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}

export default function ExpertAnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [questions, setQuestions] = useState<QuestionsData | null>(null);
  const [topicGaps, setTopicGaps] = useState<TopicGapsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const [analyticsRes, questionsRes, gapsRes] = await Promise.all([
        fetch(`/api/expert/analytics?period=${p}`),
        fetch(`/api/expert/analytics/questions?period=${p}&limit=20`),
        fetch(`/api/expert/analytics/topic-gaps?period=${p}`),
      ]);

      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
      if (questionsRes.ok) {
        const data = await questionsRes.json();
        setQuestions(data);
      }
      if (gapsRes.ok) {
        setTopicGaps(await gapsRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-600/20 ring-1 ring-blue-600/20">
              <BarChart3 className="h-6 w-6 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
              <p className="text-sm text-muted-foreground">Track your performance and growth</p>
            </div>
          </div>
          <div className="shrink-0">
            <DateRangeSelector value={period} onChange={handlePeriodChange} />
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const overview = analytics?.overview;

  return (
    <PageTransition className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FadeIn direction="left">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-600/20 ring-1 ring-blue-600/20 shadow-lg shadow-blue-600/5">
              <BarChart3 className="h-6 w-6 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
              <p className="text-sm text-muted-foreground">Track your performance and growth</p>
            </div>
          </div>
        </FadeIn>
        <FadeIn direction="right" delay={0.1}>
          <div className="shrink-0 rounded-xl bg-muted p-1 ring-1 ring-border/50 ">
            <DateRangeSelector value={period} onChange={handlePeriodChange} />
          </div>
        </FadeIn>
      </div>

      {/* Row 1: Stat Cards */}
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            title="Total Subscribers"
            value={overview?.totalSubscribers ?? 0}
            icon={Users}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Active Subscribers"
            value={overview?.activeSubscribers ?? 0}
            icon={UserCheck}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Revenue"
            value={`₹${(overview?.periodRevenue ?? 0).toFixed(2)}`}
            description={`₹${(overview?.totalRevenue ?? 0).toFixed(2)} total`}
            icon={DollarSign}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Twin Questions"
            value={overview?.periodTwinQuestions ?? 0}
            description={`${overview?.totalTwinQuestions ?? 0} total`}
            icon={MessageSquare}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Row 2: Subscriber Growth + Revenue Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FadeIn delay={0.2} direction="up">
          <div className="relative rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent pointer-events-none" />
            <div className="relative">
              <SubscriberGrowthChart data={analytics?.subscriberGrowth ?? []} />
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.3} direction="up">
          <div className="relative rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.02] to-transparent pointer-events-none" />
            <div className="relative">
              <RevenueChart data={analytics?.revenueOverTime ?? []} />
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Row 3: Twin Usage Line Chart */}
      <FadeIn delay={0.35} direction="up">
        <Card className="relative overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md">
          {/* Subtle top accent */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-600/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.02] to-transparent pointer-events-none" />
          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 ring-1 ring-blue-600/20">
                <Activity className="h-4.5 w-4.5 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Twin Usage</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Questions asked to your digital twin</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pt-2">
            {(analytics?.twinUsage ?? []).length === 0 ? (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm">No twin usage data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.twinUsage ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={formatDate}
                    formatter={(value: unknown) => [String(value), "Questions"]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="questions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "hsl(var(--primary))",
                      stroke: "hsl(var(--background))",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Row 4: Content Performance */}
      <FadeIn delay={0.4} direction="up">
        <div className="relative rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.015] to-transparent pointer-events-none" />
          <div className="relative">
            <ContentPerformanceTable data={analytics?.contentPerformance ?? []} />
          </div>
        </div>
      </FadeIn>

      {/* Row 5: Questions + Topic Gaps */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FadeIn delay={0.45} direction="up">
          <div className="relative rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md h-full">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.015] to-transparent pointer-events-none" />
            <div className="relative h-full">
              <PopularQuestionsList questions={questions?.questions ?? []} />
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.5} direction="up">
          <div className="relative rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md h-full">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.015] to-transparent pointer-events-none" />
            <div className="relative h-full">
              <TopicGapsCard gaps={topicGaps?.gaps ?? []} />
            </div>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
