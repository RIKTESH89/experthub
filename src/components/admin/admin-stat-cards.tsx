"use client";

import { useState, useEffect } from "react";
import { Users, Shield, CreditCard, FileText } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Users"
        value={stats.totalUsers.toLocaleString()}
        icon={Users}
        trend={stats.trends.users}
        description="from last month"
      />
      <StatCard
        title="Active Experts"
        value={stats.activeExperts.toLocaleString()}
        icon={Shield}
        trend={stats.trends.experts}
        description="from last month"
      />
      <StatCard
        title="Active Subscriptions"
        value={stats.activeSubscriptions.toLocaleString()}
        icon={CreditCard}
        trend={stats.trends.subscriptions}
        description="from last month"
      />
      <StatCard
        title="Total Posts"
        value={stats.totalPosts.toLocaleString()}
        icon={FileText}
        trend={stats.trends.posts}
        description="from last month"
      />
    </div>
  );
}
