"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HubHero } from "@/components/hub/hub-hero";
import { TrendingTopics } from "@/components/hub/trending-topics";
import { DiscoverSection } from "@/components/hub/discover-section";
import { ExpertGrid } from "@/components/experts/expert-grid";
import { PostFeed } from "@/components/posts/post-feed";
import { type Expert } from "@/components/experts/expert-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const popularTopics = [
  {
    name: "Artificial Intelligence",
    description: "Machine learning, deep learning, and AI ethics",
    color: "from-blue-500/20 to-purple-500/20",
    postCount: 342,
  },
  {
    name: "Finance & Investing",
    description: "Markets, portfolios, and financial planning",
    color: "from-green-500/20 to-emerald-500/20",
    postCount: 289,
  },
  {
    name: "Health & Wellness",
    description: "Nutrition, fitness, and mental health",
    color: "from-pink-500/20 to-rose-500/20",
    postCount: 256,
  },
  {
    name: "Technology",
    description: "Software, hardware, and emerging tech",
    color: "from-violet-500/20 to-indigo-500/20",
    postCount: 198,
  },
  {
    name: "Marketing",
    description: "Digital marketing, branding, and growth",
    color: "from-orange-500/20 to-amber-500/20",
    postCount: 175,
  },
  {
    name: "Leadership",
    description: "Management, strategy, and team building",
    color: "from-cyan-500/20 to-sky-500/20",
    postCount: 143,
  },
];

export default function SubscriberHubPage() {
  const [featuredExperts, setFeaturedExperts] = useState<Expert[]>([]);
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
    fetchExperts();
  }, []);

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Hero with Search */}
      <HubHero />

      {/* Trending Topics */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Trending Topics
        </h2>
        <TrendingTopics />
      </section>

      {/* Featured Experts */}
      <DiscoverSection
        title="Featured Experts"
        description="Top experts with the most engaged communities"
        seeAllHref="/subscriber/hub"
      >
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="space-y-4 rounded-lg border border-border p-6"
              >
                <div className="flex flex-col items-center">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="mt-3 h-4 w-24" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ExpertGrid experts={featuredExperts} />
        )}
      </DiscoverSection>

      {/* Recent Posts */}
      <DiscoverSection
        title="Recent Posts"
        description="Fresh content from across the platform"
      >
        <PostFeed
          endpoint="/api/posts?sort=recent&limit=5"
          emptyTitle="No posts yet"
          emptyDescription="Check back soon for new content."
        />
      </DiscoverSection>

      {/* Popular Topics */}
      <DiscoverSection
        title="Popular Topics"
        description="Browse content by category"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularTopics.map((topic) => (
            <Link
              key={topic.name}
              href={`/hub/topics/${topic.name.toLowerCase()}`}
            >
              <Card className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="relative p-5">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${topic.color} opacity-50 transition-opacity group-hover:opacity-70`}
                  />
                  <div className="relative">
                    <h3 className="text-base font-semibold">{topic.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {topic.description}
                    </p>
                    <Badge variant="secondary" className="mt-3 text-[10px]">
                      {topic.postCount} posts
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </DiscoverSection>
    </div>
  );
}
