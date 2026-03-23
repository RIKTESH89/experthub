"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  FileText,
  Eye,
  TrendingUp,
  Plus,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

function generateViewsData() {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: Math.floor(Math.random() * 300) + 50,
    });
  }
  return days;
}

export default function ExpertDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ExpertStats | null>(null);
  const [recentSubscribers, setRecentSubscribers] = useState<RecentSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const viewsData = useMemo(() => generateViewsData(), []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, subsRes] = await Promise.all([
          fetch("/api/expert/stats"),
          fetch("/api/expert/subscribers?limit=5&sort=recent"),
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <WelcomeBanner
        userName={session?.user?.name ?? "Expert"}
        role="EXPERT"
      />

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Subscribers"
            value={stats.totalSubscribers.toLocaleString()}
            icon={Users}
            trend={stats.trends.subscribers}
            description="from last month"
          />
          <StatCard
            title="Total Posts"
            value={stats.totalPosts.toLocaleString()}
            icon={FileText}
            trend={stats.trends.posts}
            description="from last month"
          />
          <StatCard
            title="Total Views"
            value={stats.totalViews.toLocaleString()}
            icon={Eye}
            trend={stats.trends.views}
            description="from last month"
          />
          <StatCard
            title="Engagement Rate"
            value={`${stats.engagementRate}%`}
            icon={TrendingUp}
            trend={stats.trends.engagement}
            description="from last month"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Post Performance Chart */}
        <ChartCard
          title="Post Views"
          description="Views over the past 30 days"
          className="lg:col-span-2"
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Recent Subscribers */}
        <Card className="overflow-hidden">
          <CardHeader className="relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary/50" />
            <CardTitle className="pt-1">Recent Subscribers</CardTitle>
            <CardDescription>Latest people who subscribed</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubscribers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No subscribers yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentSubscribers.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-2.5 transition-all duration-150 hover:bg-muted/50 hover:shadow-warm-sm"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {sub.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sub.subscribedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/expert/subscribers"
              className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/expert/posts/new">
          <Card className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-warm-md hover:border-primary/30 hover:scale-[1.01]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 transition-colors group-hover:from-primary/25 group-hover:to-primary/10">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Create New Post</h3>
                <p className="text-sm text-muted-foreground">
                  Share your expertise with your subscribers
                </p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/expert/knowledge">
          <Card className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-warm-md hover:border-primary/30 hover:scale-[1.01]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 transition-colors group-hover:from-blue-500/25 group-hover:to-blue-500/10">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Knowledge Base</h3>
                <p className="text-sm text-muted-foreground">
                  Add content to power your AI Digital Twin
                </p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
