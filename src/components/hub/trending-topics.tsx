"use client";

import { useState, useEffect, useRef } from "react";
import { Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Topic {
  name: string;
  postCount: number;
}

export function TrendingTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch("/api/topics/trending");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTopics(data.topics ?? data);
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchTopics();
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  if (topics.length === 0) return null;

  return (
    <div className="group relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 rounded-full bg-background shadow-md group-hover:flex"
        onClick={() => scroll("left")}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {topics.map((topic) => (
          <a
            key={topic.name}
            href="#latest-posts"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5",
              "text-sm transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            )}
          >
            <Hash className="h-3 w-3" />
            <span className="font-medium">{topic.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatNumber(topic.postCount)}
            </span>
          </a>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 rounded-full bg-background shadow-md group-hover:flex"
        onClick={() => scroll("right")}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
