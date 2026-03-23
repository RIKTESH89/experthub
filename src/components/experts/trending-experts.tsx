"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { ExpertCard, type Expert } from "./expert-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingExpertsProps {
  title?: string;
}

export function TrendingExperts({ title = "Trending Experts" }: TrendingExpertsProps) {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await fetch("/api/experts/trending");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setExperts(data.experts ?? data);
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrending();
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 300;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-[220px] shrink-0 space-y-3 rounded-lg border border-border p-6"
              >
                <div className="flex flex-col items-center">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="mt-3 h-4 w-24" />
                  <Skeleton className="mt-2 h-3 w-32" />
                  <div className="mt-3 flex gap-1">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="mt-3 h-3 w-20" />
                </div>
              </div>
            ))
          : experts.map((expert) => (
              <div key={expert.id} className="w-[220px] shrink-0">
                <ExpertCard expert={expert} />
              </div>
            ))}
      </div>
    </section>
  );
}
