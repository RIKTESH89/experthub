"use client";

import { SubscriberHeading } from "@/components/subscriber/page-heading";
import styles from "@/components/subscriber/subscriber-studio.module.css";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText,
  ArrowRight,
  Compass,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { type Post, PostCard } from "@/components/posts/post-card";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  motion,
  AnimatePresence,
} from "@/components/ui/motion";

interface SubscribedExpert {
  id: string;
  displayName: string;
  image?: string | null;
}

/* ================================================================
   SHIMMER SKELETON
   ================================================================ */

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-muted ${className ?? ""}`}

    />
  );
}

function FeedPostSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="h-11 w-11 !rounded-full" />
        <div className="space-y-2 flex-1">
          <ShimmerBlock className="h-4 w-36" />
          <ShimmerBlock className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2.5">
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-4/5" />
        <ShimmerBlock className="h-4 w-3/5" />
      </div>
      <ShimmerBlock className="h-52 w-full !rounded-xl" />
      <div className="flex gap-3 pt-1">
        <ShimmerBlock className="h-8 w-18" />
        <ShimmerBlock className="h-8 w-18" />
        <ShimmerBlock className="h-8 w-18" />
      </div>
    </div>
  );
}

/* ================================================================
   STORIES-STYLE EXPERT ROW
   ================================================================ */

function ExpertStoryRow({ experts }: { experts: SubscribedExpert[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, experts]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  if (experts.length === 0) return null;

  return (
    <FadeIn delay={0.15} direction="up">
      <div className="relative group/stories">
        {/* Left fade + arrow */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 top-0 bottom-0 z-10 flex items-center"
            >
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
              <button
                aria-label="Previous experts"
                onClick={() => scroll("left")}
                className="relative -ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border/60 shadow-md hover:bg-accent transition-colors duration-200 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right fade + arrow */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-0 top-0 bottom-0 z-10 flex items-center"
            >
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
              <button
                aria-label="Next experts"
                onClick={() => scroll("right")}
                className="relative -mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border/60 shadow-md hover:bg-accent transition-colors duration-200 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1 px-1 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {experts.map((expert, i) => (
            <motion.div
              key={expert.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <Link
                href={`/subscriber/experts/${expert.id}/chat`}
                className="group flex flex-col items-center gap-2 shrink-0 cursor-pointer"
              >
                <div className="relative">
                  {/* Ring */}
                  <div className="rounded-full p-[2.5px] bg-accent border border-border group-hover:shadow-md transition-shadow duration-200">
                    <div className="rounded-full bg-background p-[2px]">
                      <Avatar className="h-[56px] w-[56px] transition-transform duration-200 group-hover:scale-105">
                        <AvatarImage
                          src={expert.image ?? undefined}
                          alt={expert.displayName}
                        />
                        <AvatarFallback className="text-xs font-semibold bg-muted">
                          {getInitials(expert.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                </div>
                <span className="max-w-[76px] truncate text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                  {expert.displayName.split(" ")[0]}
                </span>
              </Link>
            </motion.div>
          ))}

          {/* Discover more bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * experts.length, duration: 0.25 }}
          >
            <Link
              href="/subscriber/hub"
              className="group flex flex-col items-center gap-2 shrink-0 cursor-pointer"
            >
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-dashed border-border bg-secondary transition-all duration-200 group-hover:border-primary/50 group-hover:bg-primary/5 group-hover:scale-105">
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                Discover
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </FadeIn>
  );
}

/* ================================================================
   EMPTY STATE
   ================================================================ */

function EmptyFeedState() {
  return (
    <FadeIn delay={0.2} direction="up">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="relative mb-6"
        >
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/10">
            <FileText className="h-9 w-9 text-primary/70" />
          </div>
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.2 }}
          className="text-lg font-semibold tracking-tight font-sans"
        >
          Your feed is waiting
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.2 }}
          className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed"
        >
          Subscribe to industry experts and thought leaders to see their latest insights, posts, and updates right here.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.2 }}
          className="mt-6"
        >
          <Button
            className="gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            asChild
          >
            <Link href="/subscriber/hub">
              <Compass className="h-4 w-4" />
              Explore Experts
            </Link>
          </Button>
        </motion.div>
      </div>
    </FadeIn>
  );
}

/* ================================================================
   ALL CAUGHT UP STATE
   ================================================================ */

function AllCaughtUp() {
  return (
    <FadeIn delay={0.1} direction="up">
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          You&apos;re all caught up
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Check back later for new content
        </p>
        <Button variant="ghost" size="sm" className="mt-3 gap-1.5 text-xs rounded-full cursor-pointer" asChild>
          <Link href="/subscriber/hub">
            Discover new experts
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </FadeIn>
  );
}

/* ================================================================
   ANIMATED GREETING
   ================================================================ */

/* ================================================================
   MAIN FEED PAGE
   ================================================================ */

export default function SubscriberFeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [subscribedExperts, setSubscribedExperts] = useState<SubscribedExpert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
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
        setLoadError(false);

        const res = await fetch(`/api/subscriber/feed?page=${pageNum}&limit=10`);
        if (!res.ok) throw new Error("Failed to fetch posts");

        const data = await res.json();
        const newPosts: Post[] = data.posts ?? data;

        setHasMore(newPosts.length >= 10);

        setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
      } catch {
        setLoadError(true);
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
    <PageTransition className={`${styles.page} mx-auto w-full max-w-2xl px-1 font-sans`}>
      {/* Greeting */}
      <SubscriberHeading section="Your library / Reading" title={session?.user?.name ? `${session.user.name.split(" ")[0]}’s feed` : "Your feed"} description="The latest posts from the experts you subscribe to." />

      {/* Expert story row */}
      <div className="mb-6">
        <ExpertStoryRow experts={subscribedExperts} />
      </div>

      {/* Divider */}
      <FadeIn delay={0.2} direction="none">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Feed
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </FadeIn>

      {loadError && <div className={styles.notice} role="alert"><strong>Your feed could not be loaded</strong><p>Try again to see the latest posts from your subscriptions.</p><Button disabled={isLoading || isLoadingMore} onClick={() => fetchPosts(page, page > 1)}>Try again</Button></div>}
      {/* Feed content */}
      {isLoading ? (
        <StaggerContainer className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StaggerItem key={i}>
              <FeedPostSkeleton />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : loadError && posts.length === 0 ? null : posts.length === 0 ? (
        <EmptyFeedState />
      ) : (
        <StaggerContainer className="space-y-5">
          {posts.map((post) => (
            <StaggerItem key={post.id}>
              <motion.div
                whileHover={{ y: -1 }}
                transition={{ duration: 0.2 }}
              >
                <PostCard post={post} />
              </motion.div>
            </StaggerItem>
          ))}

          {isLoadingMore && (
            <StaggerItem>
              <FeedPostSkeleton />
            </StaggerItem>
          )}

          {hasMore && <div ref={loadMoreRef} className="h-4" />}

          {!hasMore && posts.length > 0 && <AllCaughtUp />}
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
