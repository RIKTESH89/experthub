"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
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
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>

      {/* Content lines */}
      <div className="mt-4 space-y-2.5">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
        <Skeleton className="h-4 w-3/5 rounded-md" />
      </div>

      {/* Media placeholder */}
      <Skeleton className="mt-4 h-44 w-full rounded-xl" />

      {/* Action bar */}
      <div className="mt-4 flex gap-6 border-t border-border/30 pt-3">
        <Skeleton className="h-7 w-14 rounded-md" />
        <Skeleton className="h-7 w-14 rounded-md" />
        <Skeleton className="h-7 w-14 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-14 rounded-md" />
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
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.08, ease: "easeOut" }}
          >
            <PostSkeleton />
          </motion.div>
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
    <div className="space-y-5">
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            delay: Math.min(index * 0.05, 0.25),
            ease: "easeOut",
          }}
        >
          <PostCard key={post.id} post={post} />
        </motion.div>
      ))}

      {isLoadingMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <PostSkeleton />
        </motion.div>
      )}

      {hasMore && <div ref={loadMoreRef} className="h-4" />}

      {!hasMore && posts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 py-8"
        >
          <div className="h-px flex-1 bg-border/50" />
          <span className="text-sm font-sans text-muted-foreground/60">
            You&apos;ve seen it all
          </span>
          <div className="h-px flex-1 bg-border/50" />
        </motion.div>
      )}
    </div>
  );
}
