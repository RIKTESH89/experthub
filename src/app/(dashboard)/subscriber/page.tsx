"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CreditCard,
  Bookmark,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { StatCard } from "@/components/dashboard/stat-card";
import { PostFeed } from "@/components/posts/post-feed";
import { ExpertCard, type Expert } from "@/components/experts/expert-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriberStats {
  activeSubscriptions: number;
  bookmarkedPosts: number;
  twinChats: number;
}

export default function SubscriberDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [recommendedExperts, setRecommendedExperts] = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, expertsRes] = await Promise.all([
          fetch("/api/subscriber/stats"),
          fetch("/api/experts/featured?limit=4"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          setStats({ activeSubscriptions: 0, bookmarkedPosts: 0, twinChats: 0 });
        }

        if (expertsRes.ok) {
          const expertsData = await expertsRes.json();
          setRecommendedExperts(expertsData.experts ?? expertsData ?? []);
        }
      } catch {
        setStats({ activeSubscriptions: 0, bookmarkedPosts: 0, twinChats: 0 });
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
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-8 animate-fade-in">
      <WelcomeBanner
        userName={session?.user?.name ?? "there"}
        role="SUBSCRIBER"
      />

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions}
            icon={CreditCard}
            description="experts subscribed"
          />
          <StatCard
            title="Bookmarked Posts"
            value={stats.bookmarkedPosts}
            icon={Bookmark}
            description="posts saved"
          />
          <StatCard
            title="Digital Twin Chats"
            value={stats.twinChats}
            icon={MessageSquare}
            description="conversations"
          />
        </div>
      )}

      {/* Personalized Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your Feed</h2>
            <p className="text-sm text-muted-foreground">
              Latest posts from experts you follow
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/subscriber/hub">
              Discover More
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <PostFeed
          endpoint="/api/subscriber/feed"
          emptyTitle="Your feed is empty"
          emptyDescription="Subscribe to experts to see their posts here."
        />
      </div>

      {/* Recommended Experts */}
      {recommendedExperts.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="relative">
            {/* Gradient accent bar behind the header */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary/50" />
            <div className="flex items-center justify-between pt-1">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-primary/5">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  Recommended Experts
                </CardTitle>
                <CardDescription className="mt-1">
                  Experts you might be interested in
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/subscriber/hub">
                  See All
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedExperts.map((expert) => (
                <ExpertCard key={expert.id} expert={expert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
