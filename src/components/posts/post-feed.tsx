"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText } from "lucide-react";
import { PostCard, type Post } from "./post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

interface PostFeedProps {
  endpoint?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

function PostSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
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

export function PostFeed({
  endpoint = "/api/posts",
  emptyTitle = "No posts yet",
  emptyDescription = "Be the first to share something with the community.",
}: PostFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (append) setIsLoadingMore(true);
        else setIsLoading(true);

        const res = await fetch(`${endpoint}?page=${pageNum}&limit=10`);
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
    [endpoint]
  );

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {isLoadingMore && (
        <div className="space-y-4">
          <PostSkeleton />
        </div>
      )}

      {hasMore && <div ref={loadMoreRef} className="h-4" />}

      {!hasMore && posts.length > 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          You&apos;ve reached the end
        </p>
      )}
    </div>
  );
}
