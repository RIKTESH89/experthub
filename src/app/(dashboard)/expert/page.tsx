"use client";

import { previewCanonicalOrigin } from "@/lib/preview-isolation";


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
  Copy,
  Check,
  Share2,
  ExternalLink,
  Sparkles,
  Zap,
} from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
  AnimatedCounter,
} from "@/components/ui/motion";

// ─── Types ───────────────────────────────────────────────────────────

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
  overallScore: number;
  components?: Record<string, number>;
}

interface KnowledgeStatus {
  total: number;
  indexed: number;
}

// ─── Utility: generate sparkline data ────────────────────────────────

function generateViewsData(totalViews: number) {
  const days = [];
  const now = new Date();
  const dailyBase = totalViews > 0 ? Math.max(1, Math.floor(totalViews / 7)) : 0;
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const variation = totalViews > 0 ? Math.round(dailyBase * (0.7 + (((i * 37) % 10) / 10) * 0.6)) : 0;
    days.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: variation,
    });
  }
  return days;
}

// ─── Sub-components ──────────────────────────────────────────────────

function MiniTrendIcon({ direction }: { direction: "up" | "down" | "neutral" }) {
  if (direction === "up") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (direction === "down") return <TrendingDown className="h-3 w-3 text-red-400" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function trendColor(direction: "up" | "down" | "neutral") {
  if (direction === "up") return "text-emerald-500";
  if (direction === "down") return "text-red-400";
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
      <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Glow dot on last point */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill="hsl(var(--primary))" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="6" fill="hsl(var(--primary))" opacity="0.2" />
    </svg>
  );
}

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className="transform -rotate-90">
      <defs>
        <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle
        cx="46"
        cy="46"
        r={radius}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="5"
        opacity="0.4"
      />
      <circle
        cx="46"
        cy="46"
        r={radius}
        fill="none"
        stroke="url(#circleGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-200 ease-out"
      />
    </svg>
  );
}

// ─── Stat card gradient configs ──────────────────────────────────────

const statCardStyles = [
  { gradient: "from-blue-500/10 to-cyan-500/5", iconBg: "bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400", ring: "group-hover:ring-blue-500/20" },
  { gradient: "from-blue-600/10 to-blue-500/5", iconBg: "bg-blue-600/10", iconColor: "text-blue-700 dark:text-blue-400", ring: "group-hover:ring-blue-600/20" },
  { gradient: "from-amber-500/10 to-orange-500/5", iconBg: "bg-amber-500/10", iconColor: "text-amber-600 dark:text-amber-400", ring: "group-hover:ring-amber-500/20" },
  { gradient: "from-emerald-500/10 to-teal-500/5", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400", ring: "group-hover:ring-emerald-500/20" },
];

// ─── Main Page ───────────────────────────────────────────────────────

export default function ExpertDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ExpertStats | null>(null);
  const [recentSubscribers, setRecentSubscribers] = useState<RecentSubscriber[]>([]);
  const [accuracyScore, setAccuracyScore] = useState<AccuracyScore | null>(null);
  const [knowledgeStatus, setKnowledgeStatus] = useState<KnowledgeStatus>({ total: 0, indexed: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, subsRes, accuracyRes, knowledgeRes] = await Promise.all([
          fetch("/api/expert/stats"),
          fetch("/api/expert/subscribers?limit=5&sort=recent"),
          fetch("/api/expert/accuracy-score"),
          fetch("/api/knowledge/stats"),
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

  const totalViews = stats?.totalViews ?? 0;
  const viewsData = useMemo(() => generateViewsData(totalViews), [totalViews]);
  const displayedSubs = recentSubscribers.slice(0, 3);
  const remainingSubs = recentSubscribers.length - 3;
  const kbProgress = knowledgeStatus.total > 0
    ? Math.round((knowledgeStatus.indexed / knowledgeStatus.total) * 100)
    : 0;

  // ─── Loading skeleton ────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <Skeleton className="h-52 rounded-2xl lg:col-span-7" />
          <Skeleton className="h-52 rounded-2xl lg:col-span-3" />
          <Skeleton className="h-52 rounded-2xl lg:col-span-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <Skeleton className="h-44 rounded-2xl lg:col-span-4" />
          <Skeleton className="h-44 rounded-2xl lg:col-span-3" />
          <Skeleton className="h-44 rounded-2xl md:col-span-2 lg:col-span-5" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  }

  const miniStats = stats
    ? [
        { label: "Subscribers", value: stats.totalSubscribers, formatted: stats.totalSubscribers.toLocaleString(), icon: Users, trend: stats.trends.subscribers },
        { label: "Posts", value: stats.totalPosts, formatted: stats.totalPosts.toLocaleString(), icon: FileText, trend: stats.trends.posts },
        { label: "Views", value: stats.totalViews, formatted: stats.totalViews.toLocaleString(), icon: Eye, trend: stats.trends.views },
        { label: "Engagement", value: stats.engagementRate, formatted: `${stats.engagementRate}%`, icon: TrendingUp, trend: stats.trends.engagement, suffix: "%" },
      ]
    : [];

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <PageTransition className="flex min-h-[calc(100vh-8rem)] flex-col gap-6 lg:gap-7 overflow-hidden">

      {/* ══════════════════════════════════════════════════════════════
          ROW 1 — Hero: Welcome + Mini Stats | Create Post | Twin Score
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid gap-5 lg:gap-6 md:grid-cols-2 lg:grid-cols-12">

        {/* Left column: Welcome banner + stat cards */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <FadeIn delay={0} direction="up">
            <div className="relative">
              <WelcomeBanner
                userName={session?.user?.name ?? "Expert"}
                role="EXPERT"
              />
              {/* Decorative growth chart SVG */}
              <svg
                width="80"
                height="60"
                viewBox="0 0 80 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-[0.15] pointer-events-none hidden sm:block"
                aria-hidden="true"
              >
                <path d="M4 52 L20 38 L32 42 L48 22 L60 28 L76 8" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 52 L20 38 L32 42 L48 22 L60 28 L76 8 L76 60 L4 60 Z" fill="url(#heroGrowthGrad)" />
                <circle cx="76" cy="8" r="4" fill="#2563eb" />
                <circle cx="48" cy="22" r="3" fill="#1E40AF" />
                <circle cx="20" cy="38" r="3" fill="#1E40AF" />
                <defs>
                  <linearGradient id="heroGrowthGrad" x1="40" y1="8" x2="40" y2="60" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2563eb" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#1E40AF" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </FadeIn>

          {/* Mini stat cards */}
          {stats && (
            <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {miniStats.map((s, idx) => {
                const style = statCardStyles[idx];
                return (
                  <StaggerItem key={s.label}>
                    <div
                      className={`group relative rounded-2xl border border-border/40 bg-gradient-to-br ${style.gradient} p-4 shadow-sm ring-1 ring-transparent transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${style.ring} min-w-0`}
                    >
                      <div className="flex items-center gap-2 mb-2 min-w-0">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.iconBg}`}>
                          <s.icon className={`h-3.5 w-3.5 shrink-0 ${style.iconColor}`} />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase truncate min-w-0">
                          {s.label}
                        </span>
                      </div>
                      <div className="text-2xl font-bold tracking-tight leading-none truncate min-w-0">
                        <AnimatedCounter value={s.value} suffix={s.suffix} />
                      </div>
                      {(s.trend.direction !== "neutral" || s.trend.percentage > 0) && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <MiniTrendIcon direction={s.trend.direction} />
                          <span className={`text-[11px] font-semibold ${trendColor(s.trend.direction)}`}>
                            {s.trend.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>

        {/* Right column: Create Post CTA + Twin Accuracy Score */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 md:col-span-1 lg:col-span-5 lg:grid-cols-5">
          {/* Create Post CTA */}
          <FadeIn delay={0.2} direction="up" className="sm:col-span-1 lg:col-span-3">
            <Link href="/expert/posts/new" className="block h-full">
              <Card className="group relative h-full cursor-pointer overflow-hidden border-primary/20 shadow-sm transition-all duration-200 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 hover:scale-[1.01] rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-blue-500/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                {/* Subtle shimmer line on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="absolute top-0 left-[-100%] h-full w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] group-hover:left-[200%] transition-all duration-200" />
                </div>
                {/* Decorative floating document/pen SVG pattern */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect x="15%" y="12%" width="18" height="22" rx="2" fill="#1E40AF" opacity="0.1" transform="rotate(-12, 30, 23)" />
                  <rect x="18%" y="14%" width="10" height="1.5" rx="0.75" fill="#2563eb" opacity="0.12" />
                  <rect x="18%" y="18%" width="8" height="1.5" rx="0.75" fill="#2563eb" opacity="0.1" />
                  <rect x="70%" y="65%" width="16" height="20" rx="2" fill="#2563eb" opacity="0.08" transform="rotate(8, 75, 75)" />
                  <line x1="72%" y1="68%" x2="82%" y2="68%" stroke="#1E40AF" strokeWidth="1.2" opacity="0.1" />
                  <line x1="72%" y1="73%" x2="79%" y2="73%" stroke="#1E40AF" strokeWidth="1.2" opacity="0.08" />
                  <path d="M85 15 L89 11 L91 13 L87 17 Z" fill="#1E40AF" opacity="0.12" />
                  <line x1="84" y1="18" x2="88" y2="18" stroke="#2563eb" strokeWidth="1" opacity="0.1" />
                </svg>
                <CardContent className="relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 shadow-lg shadow-primary/25 transition-all duration-200 group-hover:scale-110 group-hover:shadow-primary/40">
                    <Plus className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base tracking-tight">Create Post</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug">
                      Share your expertise with subscribers
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-primary transition-all duration-200 group-hover:translate-x-1 group-hover:gap-2">
                    Start writing <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </FadeIn>

          {/* Twin Accuracy Score */}
          <FadeIn delay={0.3} direction="up" className="sm:col-span-1 lg:col-span-2">
            <Card className="group h-full border-border/40 hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
              <CardContent className="relative flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
                {accuracyScore && accuracyScore.overallScore > 0 ? (
                  <>
                    <div className="relative">
                      <CircularProgress percentage={Math.round(accuracyScore.overallScore)} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold tracking-tight">
                          <AnimatedCounter value={Math.round(accuracyScore.overallScore)} suffix="%" />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary/60" />
                      <span className="text-xs text-muted-foreground font-semibold tracking-wide">Twin Accuracy</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <CircularProgress percentage={0} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg text-muted-foreground">?</span>
                      </div>
                    </div>
                    <Link
                      href="/expert/twin"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      <Zap className="h-3 w-3" />
                      Set up Twin
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ROW 2 — Post Views | Recent Subscribers | Knowledge Base
         ══════════════════════════════════════════════════════════════ */}
      <StaggerContainer className="grid flex-1 gap-5 lg:gap-6 md:grid-cols-2 lg:grid-cols-12 auto-rows-fr">

        {/* Post Views Sparkline */}
        <StaggerItem className="md:col-span-1 lg:col-span-4">
          <Card className="group h-full border-border/40 hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl overflow-hidden flex flex-col">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />
            <CardContent className="p-5 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Post Views</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">7d trend</span>
              </div>
              <div className="flex-1 min-h-[100px] w-full">
                <SparklineChart data={viewsData} />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">
                  <AnimatedCounter value={totalViews} />
                </span>
                <span className="text-sm font-medium text-muted-foreground">total views</span>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Recent Subscribers */}
        <StaggerItem className="md:col-span-1 lg:col-span-3">
          <Card className="group h-full border-border/40 hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl overflow-hidden flex flex-col">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-600/40 to-transparent pointer-events-none" />
            <CardContent className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/10">
                  <Users className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-foreground">Recent Subscribers</span>
              </div>
              {displayedSubs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  {/* People/community SVG icon */}
                  <svg
                    width="48"
                    height="32"
                    viewBox="0 0 48 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-muted-foreground"
                    aria-hidden="true"
                  >
                    <circle cx="24" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <path d="M14 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <circle cx="10" cy="13" r="4" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5" />
                    <path d="M2 28c0-4.418 3.582-8 8-8" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
                    <circle cx="38" cy="13" r="4" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5" />
                    <path d="M46 28c0-4.418-3.582-8-8-8" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
                  </svg>
                  <p className="text-center text-xs text-muted-foreground">
                    No subscribers yet
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex-1 space-y-2.5">
                  {displayedSubs.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-muted">
                      <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-600/20 text-primary text-[10px] font-bold">
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
                  className="mt-auto pt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-all duration-200 hover:gap-2"
                >
                  +{remainingSubs} more <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              {displayedSubs.length > 0 && remainingSubs <= 0 && (
                <Link
                  href="/expert/subscribers"
                  className="mt-auto pt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-all duration-200 hover:gap-2"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Knowledge Base Status */}
        <StaggerItem className="md:col-span-2 lg:col-span-5">
          <Card className="group h-full border-border/40 hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl overflow-hidden flex flex-col">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />
            <CardContent className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-foreground">Knowledge Base</span>
                {/* Connected nodes SVG illustration */}
                <svg
                  width="60"
                  height="40"
                  viewBox="0 0 60 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="opacity-25 ml-auto"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="20" r="4" fill="#1E40AF" opacity="0.6" />
                  <circle cx="30" cy="10" r="5" fill="#2563eb" opacity="0.5" />
                  <circle cx="30" cy="30" r="3.5" fill="#1E40AF" opacity="0.5" />
                  <circle cx="48" cy="18" r="4.5" fill="#2563eb" opacity="0.6" />
                  <line x1="16" y1="19" x2="25" y2="12" stroke="#1E40AF" strokeWidth="1.2" opacity="0.4" />
                  <line x1="16" y1="21" x2="26" y2="28" stroke="#1E40AF" strokeWidth="1.2" opacity="0.4" />
                  <line x1="35" y1="11" x2="44" y2="17" stroke="#2563eb" strokeWidth="1.2" opacity="0.4" />
                  <line x1="33" y1="28" x2="44" y2="20" stroke="#2563eb" strokeWidth="1.2" opacity="0.4" />
                  <line x1="30" y1="15" x2="30" y2="26" stroke="#1E40AF" strokeWidth="1" opacity="0.3" />
                </svg>
              </div>

              <div className="mt-4 flex items-center gap-6">
                <div>
                  <div className="text-2xl font-bold tracking-tight">
                    <AnimatedCounter value={knowledgeStatus.total} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Items</span>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight">
                    <AnimatedCounter value={knowledgeStatus.indexed} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Indexed</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progress</span>
                    <span className="text-xs font-bold text-foreground">{kbProgress}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200 ease-out shadow-sm shadow-emerald-500/25"
                      style={{ width: `${kbProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-5 flex gap-3">
                <Link
                  href="/expert/knowledge"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm"
                >
                  <Database className="h-3.5 w-3.5" />
                  Add Knowledge
                </Link>
                <Link
                  href="/expert/twin"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm"
                >
                  <Network className="h-3.5 w-3.5" />
                  Build Graph
                </Link>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* ══════════════════════════════════════════════════════════════
          ROW 3 — Share Your Profile
         ══════════════════════════════════════════════════════════════ */}
      <FadeIn delay={0.35} direction="up">
        <ShareProfileCard userId={session?.user?.id ?? ""} />
      </FadeIn>

      {/* ══════════════════════════════════════════════════════════════
          ROW 4 — Quick Actions strip
         ══════════════════════════════════════════════════════════════ */}
      <FadeIn delay={0.4} direction="up">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
          {[
            { href: "/expert/posts/new", icon: Plus, label: "Create Post" },
            { href: "/expert/knowledge", icon: BookOpen, label: "Manage Knowledge" },
            { href: "/expert/twin", icon: Settings, label: "Configure Twin" },
            { href: "/expert/analytics", icon: BarChart3, label: "View Analytics" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card px-5 py-2.5 text-sm font-medium transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              <action.icon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
              {action.label}
            </Link>
          ))}
        </div>
      </FadeIn>
    </PageTransition>
  );
}

// ─── Share Profile Card ─────────────────────────────────────────────

function ShareProfileCard({ userId }: { userId: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : previewCanonicalOrigin() || process.env.NEXT_PUBLIC_APP_URL || "https://experthub.co.in";

  const profileUrl = `${baseUrl}/e/${userId}`;

  const snippets = [
    {
      id: "link",
      label: "Profile Link",
      value: profileUrl,
      description: "Your public profile — share anywhere",
    },
    {
      id: "linkedin",
      label: "LinkedIn / Twitter Bio",
      value: `💬 Chat with my AI Twin → ${profileUrl}`,
      description: "Paste in your social media bio",
    },
    {
      id: "post",
      label: "Social Media Post",
      value: `I built an AI version of myself. It knows everything I've published. Ask it anything, 24/7.\n\nTry it free → ${profileUrl}`,
      description: "Share as a post on LinkedIn, Twitter, etc.",
    },
    {
      id: "email",
      label: "Email Signature",
      value: `Chat with my AI Digital Twin: ${profileUrl}`,
      description: "Add to your email signature",
    },
  ];

  function handleCopy(id: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (!userId) return null;

  return (
    <Card className="border-border/40 shadow-sm overflow-hidden rounded-2xl hover:shadow-md transition-all duration-200">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Share2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold tracking-tight">Share Your Profile</span>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 shrink-0"
          >
            Preview <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {snippets.map((snippet) => (
            <div
              key={snippet.id}
              className="group overflow-hidden rounded-xl border border-border/40 p-3 sm:p-3.5 transition-all duration-200 hover:border-primary/30 hover:bg-secondary hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-tight">{snippet.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{snippet.description}</p>
                </div>
                <button
                  onClick={() => handleCopy(snippet.id, snippet.value)}
                  className="cursor-pointer shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
                  title="Copy to clipboard"
                >
                  {copied === snippet.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-muted px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground border border-border/30">
                {snippet.value.split("\n")[0]}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
