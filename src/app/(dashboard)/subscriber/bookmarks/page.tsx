"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PostFeed } from "@/components/posts/post-feed";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn } from "@/components/ui/motion";

export default function SubscriberBookmarksPage() {
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  return (
    <PageTransition className="space-y-6 overflow-hidden font-sans">
      {/* Page header + sort controls */}
      <FadeIn delay={0.05}>
        <div className="relative overflow-hidden rounded-xl border bg-card px-6 py-5">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#1E40AF]" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight font-sans">Bookmarks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your saved posts for easy access
              </p>
            </div>

            {/* Sort toggle */}
            <div className="flex items-center rounded-lg border border-border bg-secondary p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "relative rounded-md px-3 text-xs transition-all duration-200 cursor-pointer",
                  sort === "newest"
                    ? "bg-background font-semibold text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSort("newest")}
              >
                Newest
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "relative rounded-md px-3 text-xs transition-all duration-200 cursor-pointer",
                  sort === "oldest"
                    ? "bg-background font-semibold text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSort("oldest")}
              >
                Oldest
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Post feed */}
      <FadeIn delay={0.15}>
        <div className="rounded-xl border bg-card">
          <PostFeed
            key={sort}
            endpoint={`/api/subscriber/bookmarks?sort=${sort}`}
            emptyTitle="No bookmarks yet"
            emptyDescription="Bookmark posts to save them here for easy access later."
          />
        </div>
      </FadeIn>
    </PageTransition>
  );
}
