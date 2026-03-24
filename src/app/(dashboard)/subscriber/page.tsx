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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials } from "@/lib/utils";

interface SubscriberStats {
  activeSubscriptions: number;
  bookmarkedPosts: number;
  twinChats: number;
}

interface SubscribedExpert {
  id: string;
  displayName: string;
  image?: string | null;
}

export default function SubscriberDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [recommendedExperts, setRecommendedExperts] = useState<Expert[]>([]);
  const [subscribedExperts, setSubscribedExperts] = useState<SubscribedExpert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expertsLoading, setExpertsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, expertsRes, subscribedRes] = await Promise.all([
          fetch("/api/subscriber/stats"),
          fetch("/api/experts/featured?limit=4"),
          fetch("/api/subscriber/subscriptions?limit=5"),
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

        if (subscribedRes.ok) {
          const subscribedData = await subscribedRes.json();
          setSubscribedExperts(
            subscribedData.experts ?? subscribedData ?? []
          );
        }
      } catch {
        setStats({ activeSubscriptions: 0, bookmarkedPosts: 0, twinChats: 0 });
      } finally {
        setIsLoading(false);
        setExpertsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[11rem] w-full rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const displayedExperts = subscribedExperts.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Row 1: Hero — 2 columns */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left: Welcome + Stats */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <WelcomeBanner
            userName={session?.user?.name ?? "there"}
            role="SUBSCRIBER"
          />

          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                title="Subscriptions"
                value={stats.activeSubscriptions}
                icon={CreditCard}
                description="experts subscribed"
              />
              <StatCard
                title="Bookmarks"
                value={stats.bookmarkedPosts}
                icon={Bookmark}
                description="posts saved"
              />
              <StatCard
                title="Twin Chats"
                value={stats.twinChats}
                icon={MessageSquare}
                description="conversations"
              />
            </div>
          )}
        </div>

        {/* Right: Your Experts widget */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex-1 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-primary/5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Your Experts
                </h3>
              </div>

              {/* Avatar row */}
              <div className="flex items-center gap-3 flex-wrap">
                {displayedExperts.length > 0 ? (
                  displayedExperts.map((expert) => (
                    <Link
                      key={expert.id}
                      href={`/subscriber/experts/${expert.id}/chat`}
                      className="group relative"
                      title={`Chat with ${expert.displayName}`}
                    >
                      <Avatar className="h-12 w-12 ring-2 ring-background transition-transform duration-200 group-hover:scale-110">
                        <AvatarImage
                          src={expert.image ?? undefined}
                          alt={expert.displayName}
                        />
                        <AvatarFallback className="text-xs font-medium">
                          {getInitials(expert.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Chat icon overlay */}
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-110">
                        <MessageSquare className="h-2.5 w-2.5" />
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No subscriptions yet. Discover experts below.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {stats?.activeSubscriptions ?? 0} subscription
                {(stats?.activeSubscriptions ?? 0) !== 1 ? "s" : ""}
              </span>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs hover:text-primary" asChild>
                <Link href="/subscriber/hub">
                  Browse more
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Tabbed content area */}
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="sticky top-0 z-10 w-full justify-start bg-muted/80 backdrop-blur-sm">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4">
          <PostFeed
            endpoint="/api/subscriber/feed"
            emptyTitle="Your feed is empty"
            emptyDescription="Subscribe to experts to see their posts here."
          />
        </TabsContent>

        <TabsContent value="discover" className="mt-4">
          {expertsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : recommendedExperts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Experts you might be interested in
                </p>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/subscriber/hub">
                    See All
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {recommendedExperts.map((expert) => (
                  <ExpertCard key={expert.id} expert={expert} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No recommendations yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Check back soon for expert suggestions.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
