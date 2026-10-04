"use client";

import { useState } from "react";
import { PostFeed } from "@/components/posts/post-feed";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/motion";
import { SubscriberHeading } from "@/components/subscriber/page-heading";
import styles from "@/components/subscriber/subscriber-studio.module.css";

export default function SubscriberBookmarksPage() {
  const [sort,setSort] = useState<"newest" | "oldest">("newest");
  return <PageTransition className={styles.page}>
    <SubscriberHeading section="Your library / Saved" title="Bookmarks" description="A reading shelf for the posts you want to return to.">
      <div role="group" aria-label="Sort saved posts" className="flex gap-2">
        {(["newest","oldest"] as const).map(value => <Button key={value} variant={sort === value ? "secondary" : "ghost"} aria-pressed={sort === value} onClick={() => setSort(value)}>{value === "newest" ? "Newest first" : "Oldest first"}</Button>)}
      </div>
    </SubscriberHeading>
    <div className="max-w-3xl"><PostFeed key={sort} endpoint={`/api/subscriber/bookmarks?sort=${sort}`} emptyTitle="Your reading shelf is empty" emptyDescription="Bookmark a post to keep it here for your next reading session." /></div>
  </PageTransition>;
}
