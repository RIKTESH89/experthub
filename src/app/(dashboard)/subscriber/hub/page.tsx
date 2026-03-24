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
        setFeaturedExperts(data.experts ?? data);
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
        <SearchBar className="max-w-2xl" />
        <div className="flex flex-wrap items-center gap-2">
          {["AI", "Finance", "Health", "Tech", "Marketing"].map((topic) => (
            <button
              key={topic}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/50 hover:bg-primary/5 transition-colors"
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
          <h2 className="text-lg font-semibold tracking-tight">
            Featured Experts
          </h2>
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-48 shrink-0 space-y-3 rounded-lg border border-border p-4"
                >
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {featuredExperts.map((expert) => (
                <div key={expert.id} className="w-48 shrink-0">
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
            <ol className="space-y-2">
              {trendingPosts.map((post, index) => (
                <li key={post.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <Link
                    href={`/subscriber/posts/${post.slug ?? post.id}`}
                    className="text-sm leading-snug hover:underline"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              No trending posts yet.
            </p>
          )}
        </div>
      </div>

      {/* Latest Posts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Latest Posts</h2>
        <PostFeed
          endpoint="/api/posts?sort=recent&limit=5"
          emptyTitle="No posts yet"
          emptyDescription="Check back soon for new content."
        />
      </section>
    </div>
  );
}
