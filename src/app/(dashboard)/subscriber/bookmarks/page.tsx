"use client";

import { PostFeed } from "@/components/posts/post-feed";
import { Button } from "@/components/ui/button";

export default function SubscriberBookmarksPage() {
  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Bookmarks</h2>
          <p className="text-sm text-muted-foreground">Your saved posts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs">
            Newest
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
          >
            Oldest
          </Button>
        </div>
      </div>

      <PostFeed
        endpoint="/api/subscriber/bookmarks"
        emptyTitle="No bookmarks yet"
        emptyDescription="Bookmark posts to save them here for easy access later."
      />
    </div>
  );
}
