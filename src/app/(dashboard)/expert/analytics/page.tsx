"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, UserCheck, DollarSign, MessageSquare } from "lucide-react";
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
          <Skeleton key={i} className="h-[120px] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-[380px] rounded-lg" />
        <Skeleton className="h-[380px] rounded-lg" />
      </div>
      <Skeleton className="h-[380px] rounded-lg" />
      <Skeleton className="h-[400px] rounded-lg" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-[400px] rounded-lg" />
        <Skeleton className="h-[400px] rounded-lg" />
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
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-12 w-auto shrink-0">
              {/* Chart area background */}
              <rect x="10" y="10" width="100" height="60" rx="4" fill="#f5f3ff" stroke="#ede9fe" strokeWidth="1"/>
              {/* Grid lines */}
              <line x1="10" y1="30" x2="110" y2="30" stroke="#ede9fe" strokeWidth="1"/>
              <line x1="10" y1="50" x2="110" y2="50" stroke="#ede9fe" strokeWidth="1"/>
              {/* Chart line */}
              <polyline points="18,55 35,48 50,52 65,35 80,30 95,18 105,22" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Area fill under line */}
              <path d="M18 55L35 48L50 52L65 35L80 30L95 18L105 22V65H18Z" fill="#6366f1" opacity="0.08"/>
              {/* Upward trend arrow */}
              <path d="M90 14l12-4-4 12" stroke="#8b5cf6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="90" y1="14" x2="102" y2="10" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
              {/* Data dots */}
              <circle cx="65" cy="35" r="3" fill="#8b5cf6"/>
              <circle cx="95" cy="18" r="3" fill="#6366f1"/>
            </svg>
            <h1 className="text-3xl font-bold">Analytics</h1>
          </div>
          <DateRangeSelector value={period} onChange={handlePeriodChange} />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const overview = analytics?.overview;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-12 w-auto shrink-0">
            {/* Chart area background */}
            <rect x="10" y="10" width="100" height="60" rx="4" fill="#f5f3ff" stroke="#ede9fe" strokeWidth="1"/>
            {/* Grid lines */}
            <line x1="10" y1="30" x2="110" y2="30" stroke="#ede9fe" strokeWidth="1"/>
            <line x1="10" y1="50" x2="110" y2="50" stroke="#ede9fe" strokeWidth="1"/>
            {/* Chart line */}
            <polyline points="18,55 35,48 50,52 65,35 80,30 95,18 105,22" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Area fill under line */}
            <path d="M18 55L35 48L50 52L65 35L80 30L95 18L105 22V65H18Z" fill="#6366f1" opacity="0.08"/>
            {/* Upward trend arrow */}
            <path d="M90 14l12-4-4 12" stroke="#8b5cf6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="90" y1="14" x2="102" y2="10" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
            {/* Data dots */}
            <circle cx="65" cy="35" r="3" fill="#8b5cf6"/>
            <circle cx="95" cy="18" r="3" fill="#6366f1"/>
          </svg>
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>
        <DateRangeSelector value={period} onChange={handlePeriodChange} />
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Subscribers"
          value={overview?.totalSubscribers ?? 0}
          icon={Users}
        />
        <StatCard
          title="Active Subscribers"
          value={overview?.activeSubscribers ?? 0}
          icon={UserCheck}
        />
        <StatCard
          title="Revenue"
          value={`₹${(overview?.periodRevenue ?? 0).toFixed(2)}`}
          description={`₹${(overview?.totalRevenue ?? 0).toFixed(2)} total`}
          icon={DollarSign}
        />
        <StatCard
          title="Twin Questions"
          value={overview?.periodTwinQuestions ?? 0}
          description={`${overview?.totalTwinQuestions ?? 0} total`}
          icon={MessageSquare}
        />
      </div>

      {/* Row 2: Subscriber Growth + Revenue Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SubscriberGrowthChart data={analytics?.subscriberGrowth ?? []} />
        <RevenueChart data={analytics?.revenueOverTime ?? []} />
      </div>

      {/* Row 3: Twin Usage Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Twin Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {(analytics?.twinUsage ?? []).length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No twin usage data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.twinUsage ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  fontSize={12}
                />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value: unknown) => [String(value), "Questions"]}
                />
                <Line
                  type="monotone"
                  dataKey="questions"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Row 4: Content Performance */}
      <ContentPerformanceTable data={analytics?.contentPerformance ?? []} />

      {/* Row 5: Questions + Topic Gaps */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PopularQuestionsList questions={questions?.questions ?? []} />
        <TopicGapsCard gaps={topicGaps?.gaps ?? []} />
      </div>
    </div>
  );
}
