"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { SearchBar } from "@/components/hub/search-bar";
import { TrendingTopics } from "@/components/hub/trending-topics";
import { ExpertCard, type Expert } from "@/components/experts/expert-card";
import { PostFeed } from "@/components/posts/post-feed";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingPost {
  id: string;
  title?: string | null;
  content?: string;
  author?: {
    name?: string | null;
    expertProfile?: {
      displayName?: string | null;
    } | null;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

export default function SubscriberHubPage() {
  const [featuredExperts, setFeaturedExperts] = useState<Expert[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExperts() {
      try {
        const res = await fetch("/api/experts/featured?limit=8");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const rawExperts = data.experts ?? data;
        setFeaturedExperts(
          rawExperts.map((e: Record<string, unknown>) => {
            const profile = e.expertProfile as Record<string, unknown> | undefined;
            if (profile) {
              return {
                id: e.id,
                displayName: profile.displayName ?? e.name ?? "",
                headline: e.headline ?? null,
                specialty: profile.specialty ?? [],
                image: e.image ?? null,
                isVerified: profile.isVerified ?? false,
                _count: {
                  subscribers: (profile.totalSubscribers as number) ?? 0,
                },
              };
            }
            return e;
          })
        );
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchTrending() {
      try {
        const res = await fetch("/api/posts/trending?limit=5");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const raw: TrendingPost[] = data.posts ?? data;
        // Deduplicate by id and title
        const seenIds = new Set<string>();
        const seenTitles = new Set<string>();
        const unique = raw.filter((p) => {
          if (seenIds.has(p.id)) return false;
          const key = (p.title || p.content?.slice(0, 60) || "").toLowerCase().trim();
          if (key && seenTitles.has(key)) return false;
          seenIds.add(p.id);
          if (key) seenTitles.add(key);
          return true;
        });
        setTrendingPosts(unique.slice(0, 5));
      } catch {
        // Silently fail
      }
    }

    fetchExperts();
    fetchTrending();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Search Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-transparent to-violet-500/[0.04] p-5 sm:p-7">
        {/* Decorative background elements */}
        <svg className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 text-primary/[0.04] sm:h-64 sm:w-64" viewBox="0 0 200 200" fill="none" aria-hidden="true">
          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 6" />
          <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="60" r="4" fill="currentColor" />
          <circle cx="140" cy="100" r="4" fill="currentColor" />
          <circle cx="100" cy="140" r="4" fill="currentColor" />
          <circle cx="60" cy="100" r="4" fill="currentColor" />
          <line x1="100" y1="64" x2="100" y2="96" stroke="currentColor" strokeWidth="0.5" />
          <line x1="104" y1="100" x2="136" y2="100" stroke="currentColor" strokeWidth="0.5" />
          <line x1="100" y1="104" x2="100" y2="136" stroke="currentColor" strokeWidth="0.5" />
          <line x1="96" y1="100" x2="64" y2="100" stroke="currentColor" strokeWidth="0.5" />
        </svg>
        <svg className="pointer-events-none absolute -left-4 bottom-0 h-24 w-24 text-violet-500/[0.05] sm:h-32 sm:w-32" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path d="M50 5 L55 20 L70 22 L58 32 L62 48 L50 40 L38 48 L42 32 L30 22 L45 20 Z" fill="currentColor" />
          <circle cx="50" cy="70" r="15" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 4" />
        </svg>

        <div className="relative z-10">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            Discover & Explore
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            Find experts, trending topics, and content that matters to you.
          </p>
          <div className="relative mt-4 w-full max-w-2xl">
            <SearchBar className="w-full" />
          </div>
          <div className="mt-3">
            <TrendingTopics />
          </div>
        </div>
      </div>

      {/* Featured Experts */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          Featured Experts
        </h2>
        {isLoading ? (
          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto scroll-smooth pb-2" style={{ scrollbarWidth: "none" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-48 sm:w-52 shrink-0 space-y-3 rounded-lg border border-border p-4"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-7 w-full rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto scroll-smooth pb-2 items-stretch" style={{ scrollbarWidth: "none" }}>
            {featuredExperts.map((expert) => (
              <div key={expert.id} className="w-48 sm:w-52 shrink-0">
                <ExpertCard expert={expert} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending This Week */}
      {trendingPosts.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/50 p-4 sm:p-5">
          {/* Decorative background */}
          <svg className="pointer-events-none absolute right-3 top-3 h-16 w-16 text-orange-500/[0.06] sm:h-20 sm:w-20" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <path d="M40 8 L44 24 L60 20 L52 34 L68 38 L52 42 L60 56 L44 52 L40 68 L36 52 L20 56 L28 42 L12 38 L28 34 L20 20 L36 24 Z" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="40" cy="38" r="8" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" />
          </svg>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </div>
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                Trending This Week
              </h2>
            </div>

            <ol className="space-y-0 divide-y divide-border/50">
              {trendingPosts.map((post, index) => {
                const authorName =
                  post.author?.expertProfile?.displayName ??
                  post.author?.name ??
                  "Expert";
                const engagement =
                  (post._count?.likes ?? 0) + (post._count?.comments ?? 0);
                const displayTitle =
                  post.title ||
                  (post.content ? post.content.slice(0, 60) + "..." : "Untitled post");

                return (
                  <a
                    key={post.id}
                    href="#latest-posts"
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 group transition-colors hover:bg-muted/30 -mx-1 px-1 rounded-md"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/15 to-amber-500/10 text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {displayTitle}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{authorName}</span>
                        {engagement > 0 && (
                          <>
                            <span className="text-border">·</span>
                            <span>{formatNumber(engagement)} interactions</span>
                          </>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {/* Latest Posts */}
      <section id="latest-posts" className="space-y-3 scroll-mt-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            {/* Document/feed SVG */}
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="text-primary" aria-hidden="true">
              <rect x="2" y="1" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <line x1="5" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="8.5" x2="11" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="11.5" x2="9" y2="11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            Latest Posts
          </h2>
        </div>
        <PostFeed
          endpoint="/api/posts?limit=10"
          emptyTitle="No posts yet"
          emptyDescription="Check back soon for new content."
        />
      </section>
    </div>
  );
}
