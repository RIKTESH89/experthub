"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  FileText,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  BookOpen,
  ArrowRight,
  Settings,
  BarChart3,
  Database,
  Network,
} from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface ExpertStats {
  totalSubscribers: number;
  totalPosts: number;
  totalViews: number;
  engagementRate: number;
  trends: {
    subscribers: { direction: "up" | "down" | "neutral"; percentage: number };
    posts: { direction: "up" | "down" | "neutral"; percentage: number };
    views: { direction: "up" | "down" | "neutral"; percentage: number };
    engagement: { direction: "up" | "down" | "neutral"; percentage: number };
  };
}

interface RecentSubscriber {
  id: string;
  name: string;
  subscribedAt: string;
}

interface AccuracyScore {
  score: number | null;
  configured: boolean;
}

interface KnowledgeStatus {
  totalItems: number;
  indexedItems: number;
}

function generateViewsData() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: Math.floor(Math.random() * 300) + 50,
    });
  }
  return days;
}

function MiniTrendIcon({ direction }: { direction: "up" | "down" | "neutral" }) {
  if (direction === "up") return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (direction === "down") return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function trendColor(direction: "up" | "down" | "neutral") {
  if (direction === "up") return "text-green-500";
  if (direction === "down") return "text-red-500";
  return "text-muted-foreground";
}

function SparklineChart({ data }: { data: { views: number }[] }) {
  const values = data.map((d) => d.views);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 200;
  const height = 60;
  const padding = 2;

  const points = values.map((v, i) => ({
    x: padding + (i / (values.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGradient)" />
      <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90">
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="6"
      />
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export default function ExpertDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ExpertStats | null>(null);
  const [recentSubscribers, setRecentSubscribers] = useState<RecentSubscriber[]>([]);
  const [accuracyScore, setAccuracyScore] = useState<AccuracyScore>({ score: null, configured: false });
  const [knowledgeStatus, setKnowledgeStatus] = useState<KnowledgeStatus>({ totalItems: 0, indexedItems: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const viewsData = useMemo(() => generateViewsData(), []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, subsRes, accuracyRes, knowledgeRes] = await Promise.all([
          fetch("/api/expert/stats"),
          fetch("/api/expert/subscribers?limit=5&sort=recent"),
          fetch("/api/expert/accuracy-score"),
          fetch("/api/expert/knowledge/status"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          setStats({
            totalSubscribers: 0,
            totalPosts: 0,
            totalViews: 0,
            engagementRate: 0,
            trends: {
              subscribers: { direction: "neutral", percentage: 0 },
              posts: { direction: "neutral", percentage: 0 },
              views: { direction: "neutral", percentage: 0 },
              engagement: { direction: "neutral", percentage: 0 },
            },
          });
        }

        if (subsRes.ok) {
          const subsData = await subsRes.json();
          setRecentSubscribers(subsData.subscribers ?? subsData ?? []);
        }

        if (accuracyRes.ok) {
          const accData = await accuracyRes.json();
          setAccuracyScore(accData);
        }

        if (knowledgeRes.ok) {
          const kbData = await knowledgeRes.json();
          setKnowledgeStatus(kbData);
        }
      } catch {
        setStats({
          totalSubscribers: 0,
          totalPosts: 0,
          totalViews: 0,
          engagementRate: 0,
          trends: {
            subscribers: { direction: "neutral", percentage: 0 },
            posts: { direction: "neutral", percentage: 0 },
            views: { direction: "neutral", percentage: 0 },
            engagement: { direction: "neutral", percentage: 0 },
          },
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalMonthViews = viewsData.reduce((sum, d) => sum + d.views, 0);
  const displayedSubs = recentSubscribers.slice(0, 3);
  const remainingSubs = recentSubscribers.length - 3;
  const kbProgress = knowledgeStatus.totalItems > 0
    ? Math.round((knowledgeStatus.indexedItems / knowledgeStatus.totalItems) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-52 rounded-xl lg:col-span-7" />
          <Skeleton className="h-52 rounded-xl lg:col-span-3" />
          <Skeleton className="h-52 rounded-xl lg:col-span-2" />
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-44 rounded-xl lg:col-span-4" />
          <Skeleton className="h-44 rounded-xl lg:col-span-3" />
          <Skeleton className="h-44 rounded-xl lg:col-span-5" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const miniStats = stats
    ? [
        { label: "Subscribers", value: stats.totalSubscribers.toLocaleString(), icon: Users, trend: stats.trends.subscribers },
        { label: "Posts", value: stats.totalPosts.toLocaleString(), icon: FileText, trend: stats.trends.posts },
        { label: "Views", value: stats.totalViews.toLocaleString(), icon: Eye, trend: stats.trends.views },
        { label: "Engagement", value: `${stats.engagementRate}%`, icon: TrendingUp, trend: stats.trends.engagement },
      ]
    : [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Row 1: Hero section ── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: Welcome + Mini Stats */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <WelcomeBanner
            userName={session?.user?.name ?? "Expert"}
            role="EXPERT"
          />
          {stats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {miniStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className="h-3.5 w-3.5 text-primary/70" />
                    <span className="text-xs text-muted-foreground truncate">{s.label}</span>
                  </div>
                  <div className="text-lg font-bold tracking-tight leading-none">{s.value}</div>
                  <div className="mt-1 flex items-center gap-1">
                    <MiniTrendIcon direction={s.trend.direction} />
                    <span className={`text-[10px] font-semibold ${trendColor(s.trend.direction)}`}>
                      {s.trend.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: Create Post CTA */}
        <Link href="/expert/posts/new" className="lg:col-span-3">
          <Card className="group relative h-full cursor-pointer overflow-hidden border-primary/20 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:scale-[1.01]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-primary/10 opacity-60 group-hover:opacity-100 transition-opacity" />
            <CardContent className="relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg transition-transform group-hover:scale-110">
                <Plus className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Create Post</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-snug">
                  Share your expertise with subscribers
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-xs font-medium text-primary transition-transform group-hover:translate-x-0.5">
                Start writing <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Right: Twin Accuracy Score */}
        <div className="lg:col-span-2">
          <Card className="h-full border-border/50 shadow-sm">
            <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              {accuracyScore.configured && accuracyScore.score !== null ? (
                <>
                  <div className="relative">
                    <CircularProgress percentage={accuracyScore.score} />
                    <div className="absolute inset-0 flex items-center justify-center rotate-90">
                      <span className="text-sm font-bold">{accuracyScore.score}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Twin Accuracy</span>
                </>
              ) : (
                <>
                  <div className="relative">
                    <CircularProgress percentage={0} />
                    <div className="absolute inset-0 flex items-center justify-center rotate-90">
                      <span className="text-lg text-muted-foreground">?</span>
                    </div>
                  </div>
                  <Link
                    href="/expert/twin/configure"
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Set up Twin
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Row 2: Content area ── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: Post Views Sparkline */}
        <Card className="lg:col-span-4 border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Post Views</span>
              <span className="text-xs text-muted-foreground">7 days</span>
            </div>
            <div className="h-[60px] w-full">
              <SparklineChart data={viewsData} />
            </div>
            <p className="mt-2 text-sm font-semibold">
              {totalMonthViews.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">views this week</span>
            </p>
          </CardContent>
        </Card>

        {/* Center: Recent Subscribers (compact) */}
        <Card className="lg:col-span-3 border-border/50 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Recent Subscribers</span>
            {displayedSubs.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No subscribers yet
              </p>
            ) : (
              <div className="mt-2.5 space-y-2">
                {displayedSubs.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {sub.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">{sub.name}</span>
                  </div>
                ))}
              </div>
            )}
            {remainingSubs > 0 && (
              <Link
                href="/expert/subscribers"
                className="mt-2.5 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                +{remainingSubs} more <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {displayedSubs.length > 0 && remainingSubs <= 0 && (
              <Link
                href="/expert/subscribers"
                className="mt-2.5 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Right: Knowledge Base Status */}
        <Card className="lg:col-span-5 border-border/50 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Knowledge Base</span>
            <div className="mt-3 flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold">{knowledgeStatus.totalItems}</div>
                <span className="text-[10px] text-muted-foreground">Total Items</span>
              </div>
              <div>
                <div className="text-2xl font-bold">{knowledgeStatus.indexedItems}</div>
                <span className="text-[10px] text-muted-foreground">Indexed</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Progress</span>
                  <span className="text-[10px] font-medium">{kbProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                    style={{ width: `${kbProgress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href="/expert/knowledge"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50 hover:border-primary/30"
              >
                <Database className="h-3 w-3" />
                Add Knowledge
              </Link>
              <Link
                href="/expert/knowledge/graph"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50 hover:border-primary/30"
              >
                <Network className="h-3 w-3" />
                Build Graph
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Quick Actions strip ── */}
      <div className="flex flex-wrap gap-3">
        {[
          { href: "/expert/posts/new", icon: Plus, label: "Create Post" },
          { href: "/expert/knowledge", icon: BookOpen, label: "Manage Knowledge" },
          { href: "/expert/twin/configure", icon: Settings, label: "Configure Twin" },
          { href: "/expert/analytics", icon: BarChart3, label: "View Analytics" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-all duration-150 hover:border-primary/50 hover:bg-primary/5"
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
