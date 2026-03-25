"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Search, CreditCard, TrendingUp } from "lucide-react";
import { formatDate, getInitials, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

interface Subscriber {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  subscriptionDate: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  monthlyAmount: number;
}

interface SubscriberStats {
  total: number;
  active: number;
  mrr: number;
  subsTrend: { direction: "up" | "down" | "neutral"; percentage: number };
  revenueTrend: { direction: "up" | "down" | "neutral"; percentage: number };
}

export default function ExpertSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchSubscribers() {
      try {
        const res = await fetch("/api/expert/subscribers");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSubscribers(data.subscribers ?? data);
      } catch {
        toast.error("Failed to load subscribers");
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubscribers();
  }, []);

  const filteredSubscribers = useMemo(() => {
    if (!searchQuery) return subscribers;
    return subscribers.filter(
      (sub) =>
        (sub.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subscribers, searchQuery]);

  const stats: SubscriberStats = useMemo(() => {
    const active = subscribers.filter((s) => s.status === "ACTIVE").length;
    const mrr = subscribers
      .filter((s) => s.status === "ACTIVE")
      .reduce((sum, s) => sum + s.monthlyAmount, 0);

    // Calculate real trends by comparing last 30 days vs previous 30 days
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const recentSubs = subscribers.filter(
      (s) => new Date(s.subscriptionDate).getTime() > now - thirtyDays
    ).length;
    const prevSubs = subscribers.filter((s) => {
      const t = new Date(s.subscriptionDate).getTime();
      return t > now - thirtyDays * 2 && t <= now - thirtyDays;
    }).length;

    const recentRevenue = subscribers
      .filter((s) => s.status === "ACTIVE" && new Date(s.subscriptionDate).getTime() > now - thirtyDays)
      .reduce((sum, s) => sum + s.monthlyAmount, 0);
    const prevRevenue = subscribers
      .filter((s) => {
        const t = new Date(s.subscriptionDate).getTime();
        return s.status === "ACTIVE" && t > now - thirtyDays * 2 && t <= now - thirtyDays;
      })
      .reduce((sum, s) => sum + s.monthlyAmount, 0);

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0 && current === 0) return { direction: "neutral" as const, percentage: 0 };
      if (previous === 0) return { direction: "up" as const, percentage: 100 };
      const pct = Math.round(((current - previous) / previous) * 100);
      return {
        direction: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("neutral" as const),
        percentage: Math.abs(pct),
      };
    };

    return {
      total: subscribers.length,
      active,
      mrr,
      subsTrend: calcTrend(recentSubs, prevSubs),
      revenueTrend: calcTrend(recentRevenue, prevRevenue),
    };
  }, [subscribers]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
          {/* Central user */}
          <circle cx="80" cy="40" r="14" fill="#ede9fe" stroke="#6366f1" strokeWidth="2"/>
          <circle cx="80" cy="35" r="5.5" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5"/>
          <path d="M72 47a8 8 0 0116 0" stroke="#6366f1" strokeWidth="1.5" fill="#e0e7ff"/>
          {/* Top-left user */}
          <circle cx="32" cy="24" r="10" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1.5"/>
          <circle cx="32" cy="20" r="4" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1"/>
          <path d="M26 28a6 6 0 0112 0" stroke="#8b5cf6" strokeWidth="1" fill="#ede9fe"/>
          {/* Top-right user */}
          <circle cx="128" cy="24" r="10" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1.5"/>
          <circle cx="128" cy="20" r="4" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1"/>
          <path d="M122 28a6 6 0 0112 0" stroke="#8b5cf6" strokeWidth="1" fill="#ede9fe"/>
          {/* Bottom-left user */}
          <circle cx="40" cy="78" r="10" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1.5"/>
          <circle cx="40" cy="74" r="4" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1"/>
          <path d="M34 82a6 6 0 0112 0" stroke="#8b5cf6" strokeWidth="1" fill="#ede9fe"/>
          {/* Bottom-right user */}
          <circle cx="120" cy="78" r="10" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1.5"/>
          <circle cx="120" cy="74" r="4" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1"/>
          <path d="M114 82a6 6 0 0112 0" stroke="#8b5cf6" strokeWidth="1" fill="#ede9fe"/>
          {/* Connection lines */}
          <line x1="44" y1="30" x2="66" y2="36" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 2"/>
          <line x1="116" y1="30" x2="94" y2="36" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 2"/>
          <line x1="50" y1="72" x2="68" y2="52" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 2"/>
          <line x1="110" y1="72" x2="92" y2="52" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 2"/>
          {/* Sparkle */}
          <path d="M80 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#6366f1" opacity="0.5"/>
        </svg>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscribers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage your audience
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Subscribers"
          value={formatNumber(stats.total)}
          icon={Users}
          description="all time"
        />
        <StatCard
          title="Active Subscriptions"
          value={formatNumber(stats.active)}
          icon={CreditCard}
          trend={stats.subsTrend.direction !== "neutral" || stats.subsTrend.percentage > 0 ? stats.subsTrend : undefined}
          description="from last month"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.mrr.toFixed(2)}`}
          icon={TrendingUp}
          trend={stats.revenueTrend.direction !== "neutral" || stats.revenueTrend.percentage > 0 ? stats.revenueTrend : undefined}
          description="from last month"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search subscribers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {subscribers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No subscribers yet"
          description="Share your profile to attract subscribers and grow your audience."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No matching subscribers
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={sub.image ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(sub.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{sub.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            sub.status === "ACTIVE"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : sub.status === "CANCELLED"
                                ? "bg-gray-500/10 text-gray-600"
                                : "bg-red-500/10 text-red-600"
                          }
                        >
                          {sub.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        ${(sub.monthlyAmount ?? 0).toFixed(2)}/mo
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(sub.subscriptionDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filteredSubscribers.length} of {subscribers.length} subscribers
      </p>
    </div>
  );
}
