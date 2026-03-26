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
        // Deduplicate by id
        const seen = new Set<string>();
        const unique = raw.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
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
    <div className="space-y-6">
      {/* Search + Filter Chips */}
      <div className="space-y-3">
        <div className="relative w-full max-w-2xl">
          <SearchBar className="w-full" />
          {/* Decorative magnifying glass SVG */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/15 hidden sm:block"
            aria-hidden="true"
          >
            <circle cx="18" cy="18" r="10" stroke="currentColor" strokeWidth="2" />
            <line x1="25.5" y1="25.5" x2="34" y2="34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="18" cy="18" r="4" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
        <TrendingTopics />
      </div>

      {/* Featured Experts */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          {/* Star SVG */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-amber-500" aria-hidden="true">
            <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26 5.06 16.7 6 11.21l-4-3.9 5.53-.8L10 1.5z" fill="currentColor" opacity="0.85" />
          </svg>
          Featured Experts
        </h2>
        {isLoading ? (
          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto scroll-smooth pb-2" style={{ scrollbarWidth: "none" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-44 sm:w-48 shrink-0 space-y-3 rounded-lg border border-border p-4"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto scroll-smooth pb-2" style={{ scrollbarWidth: "none" }}>
            {featuredExperts.map((expert) => (
              <div key={expert.id} className="w-44 sm:w-48 shrink-0">
                <ExpertCard expert={expert} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending This Week */}
      {trendingPosts.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10">
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight">
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
                  className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 group transition-colors hover:bg-muted/30 -mx-1 px-1 rounded-md"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground mt-0.5">
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
      )}

      {/* Latest Posts */}
      <section id="latest-posts" className="space-y-3 scroll-mt-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          {/* Document/feed SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-primary/70" aria-hidden="true">
            <rect x="2" y="1" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="5" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="5" y1="8.5" x2="11" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="5" y1="11.5" x2="9" y2="11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Latest Posts
        </h2>
        <PostFeed
          endpoint="/api/posts?sort=recent&limit=5"
          emptyTitle="No posts yet"
          emptyDescription="Check back soon for new content."
        />
      </section>
    </div>
  );
}
