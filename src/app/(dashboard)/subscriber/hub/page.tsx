"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/hub/search-bar";
import { ExpertCard, type Expert } from "@/components/experts/expert-card";
import { PostFeed } from "@/components/posts/post-feed";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingPost {
  id: string;
  title: string;
  slug?: string;
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
        const res = await fetch("/api/posts/trending?limit=4");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTrendingPosts(data.posts ?? data);
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
        <div className="flex overflow-x-auto sm:flex-wrap items-center gap-2 pb-1 sm:pb-0">
          {["AI", "Finance", "Health", "Tech", "Marketing"].map((topic) => (
            <button
              key={topic}
              className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Experts + Trending This Week */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Featured Experts — horizontal scroll */}
        <div className="space-y-3 lg:col-span-2">
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
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Trending This Week
          </h2>
          {trendingPosts.length > 0 ? (
            <>
              {/* Mobile: horizontal chip row */}
              <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" style={{ scrollbarWidth: "none" }}>
                {trendingPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    href={`/subscriber/hub`}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <span className="font-semibold text-muted-foreground mr-1">{index + 1}.</span>
                    {post.title}
                  </Link>
                ))}
              </div>
              {/* Desktop: vertical list */}
              <ol className="hidden lg:block space-y-2">
                {trendingPosts.map((post, index) => (
                  <li key={post.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-sm font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <Link
                      href={`/subscriber/hub`}
                      className="text-sm leading-snug hover:underline"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No trending posts yet.
            </p>
          )}
        </div>
      </div>

      {/* Latest Posts */}
      <section className="space-y-3">
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
