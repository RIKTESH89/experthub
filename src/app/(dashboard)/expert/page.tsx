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
  total: number;
  indexed: number;
}

function generateViewsData(totalViews: number) {
  const days = [];
  const now = new Date();
  // Distribute total views across 7 days with some natural variation
  // For new experts with 0 views, all points will be 0
  const dailyBase = totalViews > 0 ? Math.max(1, Math.floor(totalViews / 7)) : 0;
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Apply slight variation based on day index (deterministic, not random)
    const variation = totalViews > 0 ? Math.round(dailyBase * (0.7 + (((i * 37) % 10) / 10) * 0.6)) : 0;
    days.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: variation,
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <Skeleton className="h-52 rounded-xl lg:col-span-7" />
          <Skeleton className="h-52 rounded-xl lg:col-span-3" />
          <Skeleton className="h-52 rounded-xl lg:col-span-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <Skeleton className="h-44 rounded-xl lg:col-span-4" />
          <Skeleton className="h-44 rounded-xl lg:col-span-3" />
          <Skeleton className="h-44 rounded-xl md:col-span-2 lg:col-span-5" />
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
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-5 lg:gap-6 animate-fade-in overflow-hidden">
      {/* ── Row 1: Hero section ── */}
      <div className="grid gap-5 lg:gap-6 md:grid-cols-2 lg:grid-cols-12">
        {/* Left: Welcome + Mini Stats */}
        <div className="lg:col-span-7 flex flex-col gap-4">
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
              <path d="M4 52 L20 38 L32 42 L48 22 L60 28 L76 8" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 52 L20 38 L32 42 L48 22 L60 28 L76 8 L76 60 L4 60 Z" fill="url(#heroGrowthGrad)" />
              <circle cx="76" cy="8" r="4" fill="#8b5cf6" />
              <circle cx="48" cy="22" r="3" fill="#6366f1" />
              <circle cx="20" cy="38" r="3" fill="#6366f1" />
              <defs>
                <linearGradient id="heroGrowthGrad" x1="40" y1="8" x2="40" y2="60" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8b5cf6" stopOpacity="0.3" />
                  <stop offset="1" stopColor="#6366f1" stopOpacity="0.02" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {miniStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-colors hover:bg-muted/30 min-w-0"
                >
                  <div className="flex items-center gap-1.5 mb-1 min-w-0">
                    <s.icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span className="text-xs text-muted-foreground truncate min-w-0">{s.label}</span>
                  </div>
                  <div className="text-xl font-bold tracking-tight leading-none truncate min-w-0 mt-0.5">{s.value}</div>
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

        {/* Center: Create Post CTA + Twin Score (stacked on md, side by side on sm, separate cols on lg) */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-1 md:col-span-1 lg:col-span-5 lg:grid-cols-5">
          <Link href="/expert/posts/new" className="sm:col-span-1 lg:col-span-3">
            <Card className="group relative h-full cursor-pointer overflow-hidden border-primary/20 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:scale-[1.01]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-primary/10 opacity-60 group-hover:opacity-100 transition-opacity" />
              {/* Decorative floating document/pen SVG pattern */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="15%" y="12%" width="18" height="22" rx="2" fill="#6366f1" opacity="0.1" transform="rotate(-12, 30, 23)" />
                <rect x="18%" y="14%" width="10" height="1.5" rx="0.75" fill="#8b5cf6" opacity="0.12" />
                <rect x="18%" y="18%" width="8" height="1.5" rx="0.75" fill="#8b5cf6" opacity="0.1" />
                <rect x="70%" y="65%" width="16" height="20" rx="2" fill="#8b5cf6" opacity="0.08" transform="rotate(8, 75, 75)" />
                <line x1="72%" y1="68%" x2="82%" y2="68%" stroke="#6366f1" strokeWidth="1.2" opacity="0.1" />
                <line x1="72%" y1="73%" x2="79%" y2="73%" stroke="#6366f1" strokeWidth="1.2" opacity="0.08" />
                <path d="M85 15 L89 11 L91 13 L87 17 Z" fill="#6366f1" opacity="0.12" />
                <line x1="84" y1="18" x2="88" y2="18" stroke="#8b5cf6" strokeWidth="1" opacity="0.1" />
              </svg>
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

          {/* Twin Accuracy Score */}
          <div className="sm:col-span-1 lg:col-span-2">
          <Card className="group h-full border-border/50 hover:border-border transition-colors shadow-sm">
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
                    href="/expert/twin"
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
      </div>

      {/* ── Row 2: Content area (expands to fill remaining height) ── */}
      <div className="grid flex-1 gap-5 lg:gap-6 md:grid-cols-2 lg:grid-cols-12 auto-rows-fr">
        {/* Left: Post Views Sparkline */}
        <Card className="group md:col-span-1 lg:col-span-4 border-border/50 hover:border-border transition-colors shadow-sm flex flex-col">
          <CardContent className="p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Post Views</span>
              <span className="text-xs text-muted-foreground">7 days</span>
            </div>
            <div className="flex-1 min-h-[100px] w-full">
              <SparklineChart data={viewsData} />
            </div>
            <p className="mt-3 text-base font-semibold">
              {totalViews.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">total views</span>
            </p>
          </CardContent>
        </Card>

        {/* Center: Recent Subscribers (compact) */}
        <Card className="group md:col-span-1 lg:col-span-3 border-border/50 hover:border-border transition-colors shadow-sm flex flex-col">
          <CardContent className="p-5 flex flex-col flex-1">
            <span className="text-sm font-medium text-muted-foreground">Recent Subscribers</span>
            {displayedSubs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                {/* People/community SVG icon */}
                <svg
                  width="48"
                  height="32"
                  viewBox="0 0 48 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-muted-foreground/40"
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
              <div className="mt-3 flex-1 space-y-3">
                {displayedSubs.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
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
                className="mt-auto pt-3 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                +{remainingSubs} more <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {displayedSubs.length > 0 && remainingSubs <= 0 && (
              <Link
                href="/expert/subscribers"
                className="mt-auto pt-3 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Right: Knowledge Base Status */}
        <Card className="group md:col-span-2 lg:col-span-5 border-border/50 hover:border-border transition-colors shadow-sm flex flex-col">
          <CardContent className="p-5 flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Knowledge Base</span>
              {/* Connected nodes SVG illustration */}
              <svg
                width="60"
                height="40"
                viewBox="0 0 60 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-30"
                aria-hidden="true"
              >
                <circle cx="12" cy="20" r="4" fill="#6366f1" opacity="0.6" />
                <circle cx="30" cy="10" r="5" fill="#8b5cf6" opacity="0.5" />
                <circle cx="30" cy="30" r="3.5" fill="#6366f1" opacity="0.5" />
                <circle cx="48" cy="18" r="4.5" fill="#8b5cf6" opacity="0.6" />
                <line x1="16" y1="19" x2="25" y2="12" stroke="#6366f1" strokeWidth="1.2" opacity="0.4" />
                <line x1="16" y1="21" x2="26" y2="28" stroke="#6366f1" strokeWidth="1.2" opacity="0.4" />
                <line x1="35" y1="11" x2="44" y2="17" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.4" />
                <line x1="33" y1="28" x2="44" y2="20" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.4" />
                <line x1="30" y1="15" x2="30" y2="26" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
              </svg>
            </div>
            <div className="mt-3 flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold">{knowledgeStatus.total}</div>
                <span className="text-[10px] text-muted-foreground">Total Items</span>
              </div>
              <div>
                <div className="text-2xl font-bold">{knowledgeStatus.indexed}</div>
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
            <div className="mt-auto pt-4 flex gap-3">
              <Link
                href="/expert/knowledge"
                className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 hover:border-primary/30"
              >
                <Database className="h-3 w-3" />
                Add Knowledge
              </Link>
              <Link
                href="/expert/twin"
                className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 hover:border-primary/30"
              >
                <Network className="h-3 w-3" />
                Build Graph
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Quick Actions strip ── */}
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
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-all duration-150 hover:border-primary/50 hover:bg-primary/5"
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
