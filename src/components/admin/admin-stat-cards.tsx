"use client";

import { useState, useEffect } from "react";
import { Users, Shield, CreditCard, FileText } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  activeExperts: number;
  activeSubscriptions: number;
  totalPosts: number;
  trends: {
    users: { direction: "up" | "down" | "neutral"; percentage: number };
    experts: { direction: "up" | "down" | "neutral"; percentage: number };
    subscriptions: { direction: "up" | "down" | "neutral"; percentage: number };
    posts: { direction: "up" | "down" | "neutral"; percentage: number };
  };
}

const cardMeta = [
  {
    key: "totalUsers" as const,
    trendKey: "users" as const,
    title: "Total Users",
    icon: Users,
    bgAccent: "bg-primary/5 dark:bg-primary/10",
  },
  {
    key: "activeExperts" as const,
    trendKey: "experts" as const,
    title: "Active Experts",
    icon: Shield,
    bgAccent: "bg-primary/5 dark:bg-primary/10",
  },
  {
    key: "activeSubscriptions" as const,
    trendKey: "subscriptions" as const,
    title: "Active Subscriptions",
    icon: CreditCard,
    bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10",
  },
  {
    key: "totalPosts" as const,
    trendKey: "posts" as const,
    title: "Total Posts",
    icon: FileText,
    bgAccent: "bg-amber-500/5 dark:bg-amber-500/10",
  },
];

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-muted", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
    </div>
  );
}

function StatCardSkeleton({ index }: { index: number }) {
  const meta = cardMeta[index];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/50 p-6",
        "bg-card",
        meta.bgAccent
      )}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-muted" />

      <div className="flex items-center justify-between mb-4">
        <ShimmerSkeleton className="h-4 w-28 rounded-md" />
        <ShimmerSkeleton className="h-10 w-10 rounded-xl" />
      </div>

      <ShimmerSkeleton className="h-9 w-20 rounded-md" />

      <div className="mt-3 flex items-center gap-2">
        <ShimmerSkeleton className="h-5 w-16 rounded-full" />
        <ShimmerSkeleton className="h-3.5 w-24 rounded-md" />
      </div>

      {/* Sparkline skeleton */}
      <div className="mt-4 -mx-6 -mb-6 px-0">
        <ShimmerSkeleton className="h-8 w-full rounded-none" />
      </div>
    </div>
  );
}

export function AdminStatCards() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setStats(data);
      } catch {
        // Use fallback data if API fails
        setStats({
          totalUsers: 0,
          activeExperts: 0,
          activeSubscriptions: 0,
          totalPosts: 0,
          trends: {
            users: { direction: "neutral", percentage: 0 },
            experts: { direction: "neutral", percentage: 0 },
            subscriptions: { direction: "neutral", percentage: 0 },
            posts: { direction: "neutral", percentage: 0 },
          },
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 font-sans">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 font-sans">
      {cardMeta.map((meta) => (
        <StaggerItem key={meta.key}>
          <StatCard
            title={meta.title}
            value={stats[meta.key].toLocaleString()}
            icon={meta.icon}
            trend={stats.trends[meta.trendKey]}
            description="from last month"
          />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
