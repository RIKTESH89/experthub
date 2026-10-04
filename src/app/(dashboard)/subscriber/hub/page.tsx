"use client";

import { SubscriberHeading } from "@/components/subscriber/page-heading";
import styles from "@/components/subscriber/subscriber-studio.module.css";

import { useState, useEffect } from "react";
import { TrendingUp, Flame } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { SearchBar } from "@/components/hub/search-bar";
import { ExpertCard, type Expert } from "@/components/experts/expert-card";
import { PostFeed } from "@/components/posts/post-feed";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion";

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
  const [expertsError, setExpertsError] = useState(false);
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
        setExpertsError(true);
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
    <PageTransition className={styles.page}>
      <div className="space-y-10 font-sans">
        <SubscriberHeading section="Explore / Knowledge hub" title="Find your next perspective" description="Discover expert profiles and explore their published ideas." />
        <div className="max-w-2xl"><SearchBar className="w-full" /></div>
        {/* ─── Featured Experts ─── */}
        <FadeIn delay={0.15} direction="up">
          <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight sm:text-lg font-sans">
                    Featured Experts
                  </h2>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Explore featured expert profiles
                  </p>
                </div>
              </div>
            </div>

            {expertsError && <div className={styles.notice} role="alert"><strong>Expert profiles could not be loaded</strong><p>Reload to try again. You can still browse the posts below.</p><button onClick={() => window.location.reload()} className="text-primary underline">Try again</button></div>}
            {!isLoading && !expertsError && featuredExperts.length === 0 && <p className={styles.note}>No featured experts are available yet.</p>}
            {/* Expert cards */}
            {isLoading ? (
              <div
                className={styles.expertGrid}
                style={{ scrollbarWidth: "none" }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-5"
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
              <StaggerContainer
                className={styles.expertGrid}
                style={{ scrollbarWidth: "none" }}
              >
                {featuredExperts.map((expert) => (
                  <StaggerItem
                    key={expert.id}
                    className="min-w-0"
                  >
                    <ExpertCard expert={expert} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </FadeIn>

        {/* ─── Trending This Week ─── */}
        {trendingPosts.length > 0 && (
          <FadeIn delay={0.2} direction="up">
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
              <div className="relative z-10">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
                    <Flame className="h-4.5 w-4.5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold tracking-tight sm:text-lg font-sans">
                      Trending This Week
                    </h2>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      Most engaged content right now
                    </p>
                  </div>
                  <div className="ml-auto flex h-6 items-center rounded-full border border-orange-500/20 bg-orange-500/5 px-2.5">
                    <TrendingUp className="mr-1 h-3 w-3 text-orange-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Hot
                    </span>
                  </div>
                </div>

                {/* Trending list */}
                <StaggerContainer className="space-y-0 divide-y divide-border/40">
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
                      <StaggerItem key={post.id}>
                        <a
                          href="#latest-posts"
                          className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0 group transition-all duration-200 hover:bg-secondary -mx-2 px-2 rounded-lg cursor-pointer"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 transition-transform duration-200 group-hover:scale-110 ${
                              index === 0
                                ? "bg-orange-500 text-primary-foreground"
                                : index === 1
                                ? "bg-orange-400/20 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/15"
                                : index === 2
                                ? "bg-orange-300/15 text-orange-500 dark:text-orange-400 ring-1 ring-orange-500/10"
                                : "bg-orange-500/10 text-orange-600/70 dark:text-orange-400/70"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                              {displayTitle}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">{authorName}</span>
                              {engagement > 0 && (
                                <>
                                  <span className="h-1 w-1 rounded-full bg-border" />
                                  <span>{formatNumber(engagement)} interactions</span>
                                </>
                              )}
                            </div>
                          </div>
                        </a>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              </div>
            </div>
          </FadeIn>
        )}

        {/* ─── Latest Posts ─── */}
        <FadeIn delay={0.25} direction="up">
          <section id="latest-posts" className="space-y-4 scroll-mt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="text-primary" aria-hidden="true">
                  <rect x="2" y="1" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="5" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="5" y1="8.5" x2="11" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="5" y1="11.5" x2="9" y2="11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight sm:text-lg font-sans">
                  Latest Posts
                </h2>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Recent posts from experts
                </p>
              </div>
            </div>
            <PostFeed
              endpoint="/api/posts?limit=10"
              emptyTitle="No posts yet"
              emptyDescription="Check back soon for new content."
            />
          </section>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
