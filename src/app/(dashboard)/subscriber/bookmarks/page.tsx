"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PostFeed } from "@/components/posts/post-feed";
import { Button } from "@/components/ui/button";

export default function SubscriberBookmarksPage() {
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Bookmarks</h2>
          <p className="text-sm text-muted-foreground">Your saved posts</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("text-xs", sort === "newest" ? "font-semibold" : "text-muted-foreground")}
            onClick={() => setSort("newest")}
          >
            Newest
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("text-xs", sort === "oldest" ? "font-semibold" : "text-muted-foreground")}
            onClick={() => setSort("oldest")}
          >
            Oldest
          </Button>
        </div>
      </div>

      <PostFeed
        key={sort}
        endpoint={`/api/subscriber/bookmarks?sort=${sort}`}
        emptyTitle="No bookmarks yet"
        emptyDescription="Bookmark posts to save them here for easy access later."
      />
    </div>
  );
}
