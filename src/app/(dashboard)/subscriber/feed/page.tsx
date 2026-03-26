"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type Post, PostCard } from "@/components/posts/post-card";

interface SubscribedExpert {
  id: string;
  displayName: string;
  image?: string | null;
}

/* ================================================================
   STORIES-STYLE EXPERT ROW — horizontal scrollable avatars
   ================================================================ */

function ExpertStoryRow({ experts }: { experts: SubscribedExpert[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (experts.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {experts.map((expert) => (
          <Link
            key={expert.id}
            href={`/subscriber/experts/${expert.id}/chat`}
            className="group flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-primary via-primary/80 to-violet-500 p-[2px]">
                <Avatar className="h-14 w-14 ring-2 ring-background transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage
                    src={expert.image ?? undefined}
                    alt={expert.displayName}
                  />
                  <AvatarFallback className="text-xs font-medium">
                    {getInitials(expert.displayName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <span className="max-w-[72px] truncate text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
              {expert.displayName.split(" ")[0]}
            </span>
          </Link>
        ))}

        {/* Browse more bubble */}
        <Link
          href="/subscriber/hub"
          className="group flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border transition-colors group-hover:border-primary/50 group-hover:bg-primary/5">
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
            Discover
          </span>
        </Link>
      </div>
    </div>
  );
}

/* ================================================================
   FEED SKELETON
   ================================================================ */

function FeedPostSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="flex gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

/* ================================================================
   MAIN FEED PAGE
   ================================================================ */

export default function SubscriberFeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [subscribedExperts, setSubscribedExperts] = useState<SubscribedExpert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch subscribed experts for story row
  useEffect(() => {
    async function fetchExperts() {
      try {
        const res = await fetch("/api/subscriptions");
        if (!res.ok) return;
        const data = await res.json();
        const subs = Array.isArray(data) ? data : data.experts ?? [];
        setSubscribedExperts(
          subs.map((s: { expert?: { id: string; displayName: string; image?: string | null }; id?: string; displayName?: string; image?: string | null }) => ({
            id: s.expert?.id ?? s.id ?? "",
            displayName: s.expert?.displayName ?? s.displayName ?? "",
            image: s.expert?.image ?? s.image ?? null,
          }))
        );
      } catch {
        // Non-critical
      }
    }
    fetchExperts();
  }, []);

  // Fetch feed posts
  const fetchPosts = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (append) setIsLoadingMore(true);
        else setIsLoading(true);

        const res = await fetch(`/api/subscriber/feed?page=${pageNum}&limit=10`);
        if (!res.ok) throw new Error("Failed to fetch posts");

        const data = await res.json();
        const newPosts: Post[] = data.posts ?? data;

        if (newPosts.length < 10) setHasMore(false);

        setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
      } catch {
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const el = loadMoreRef.current;
    if (el) observerRef.current.observe(el);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, isLoadingMore, page, fetchPosts]);

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in">
      {/* Greeting - compact */}
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">
          {session?.user?.name ? `Hey, ${session.user.name.split(" ")[0]}` : "Your Feed"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Latest from your experts
        </p>
      </div>

      {/* Expert story row */}
      <div className="mb-5">
        <ExpertStoryRow experts={subscribedExperts} />
      </div>

      {/* Divider */}
      <div className="mb-5 border-t border-border/50" />

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <FeedPostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Your feed is empty</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Subscribe to experts to see their latest posts here.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/subscriber/hub">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Discover Experts
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {isLoadingMore && (
            <div className="space-y-4">
              <FeedPostSkeleton />
            </div>
          )}

          {hasMore && <div ref={loadMoreRef} className="h-4" />}

          {!hasMore && posts.length > 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up
              </p>
              <Button variant="ghost" size="sm" className="mt-2" asChild>
                <Link href="/subscriber/hub">
                  Discover new experts
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
