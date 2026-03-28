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
import { toast } from "sonner";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
  motion,
} from "@/components/ui/motion";

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
    <PageTransition className="space-y-6">
      {/* Header */}
      <FadeIn direction="up" duration={0.5}>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
            {/* Central user */}
            <circle cx="80" cy="40" r="14" fill="#dbeafe" stroke="#1E40AF" strokeWidth="2"/>
            <circle cx="80" cy="35" r="5.5" fill="#bfdbfe" stroke="#1E40AF" strokeWidth="1.5"/>
            <path d="M72 47a8 8 0 0116 0" stroke="#1E40AF" strokeWidth="1.5" fill="#bfdbfe"/>
            {/* Top-left user */}
            <circle cx="32" cy="24" r="10" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5"/>
            <circle cx="32" cy="20" r="4" fill="#93c5fd" stroke="#2563eb" strokeWidth="1"/>
            <path d="M26 28a6 6 0 0112 0" stroke="#2563eb" strokeWidth="1" fill="#dbeafe"/>
            {/* Top-right user */}
            <circle cx="128" cy="24" r="10" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5"/>
            <circle cx="128" cy="20" r="4" fill="#93c5fd" stroke="#2563eb" strokeWidth="1"/>
            <path d="M122 28a6 6 0 0112 0" stroke="#2563eb" strokeWidth="1" fill="#dbeafe"/>
            {/* Bottom-left user */}
            <circle cx="40" cy="78" r="10" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5"/>
            <circle cx="40" cy="74" r="4" fill="#93c5fd" stroke="#2563eb" strokeWidth="1"/>
            <path d="M34 82a6 6 0 0112 0" stroke="#2563eb" strokeWidth="1" fill="#dbeafe"/>
            {/* Bottom-right user */}
            <circle cx="120" cy="78" r="10" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5"/>
            <circle cx="120" cy="74" r="4" fill="#93c5fd" stroke="#2563eb" strokeWidth="1"/>
            <path d="M114 82a6 6 0 0112 0" stroke="#2563eb" strokeWidth="1" fill="#dbeafe"/>
            {/* Connection lines */}
            <line x1="44" y1="30" x2="66" y2="36" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 2"/>
            <line x1="116" y1="30" x2="94" y2="36" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 2"/>
            <line x1="50" y1="72" x2="68" y2="52" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 2"/>
            <line x1="110" y1="72" x2="92" y2="52" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 2"/>
            {/* Sparkle */}
            <path d="M80 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#1E40AF" opacity="0.5"/>
          </svg>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Subscribers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and manage your audience
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <StatCard
            title="Total Subscribers"
            value={formatNumber(stats.total)}
            icon={Users}
            description="all time"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Active Subscriptions"
            value={formatNumber(stats.active)}
            icon={CreditCard}
            trend={stats.subsTrend.direction !== "neutral" || stats.subsTrend.percentage > 0 ? stats.subsTrend : undefined}
            description="from last month"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Monthly Revenue"
            value={`₹${stats.mrr.toFixed(2)}`}
            icon={TrendingUp}
            trend={stats.revenueTrend.direction !== "neutral" || stats.revenueTrend.percentage > 0 ? stats.revenueTrend : undefined}
            description="from last month"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Premium Search Bar */}
      <FadeIn direction="up" delay={0.2}>
        <div className="relative group">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-blue-600 transition-colors duration-200" />
            <Input
              placeholder="Search subscribers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-border/60 bg-background focus-visible:border-blue-600/40 focus-visible:ring-blue-600/20 transition-all duration-200"
            />
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground bg-muted/80 px-2 py-0.5 rounded-md transition-colors"
              >
                Clear
              </motion.button>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Table */}
      <FadeIn direction="up" delay={0.3}>
        {subscribers.length === 0 ? (
          <Card className="relative overflow-hidden border-border/50">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(30,64,175,0.04),transparent_60%)] pointer-events-none" />
            <CardContent className="py-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/15 to-blue-500/15 ring-1 ring-blue-600/20 mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-1.5">No subscribers yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Share your profile to attract subscribers and grow your audience.
                </p>
              </motion.div>
            </CardContent>
          </Card>
        ) : (
          <Card className="relative overflow-hidden border-border/50">
            {/* Top accent */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-600/40 to-transparent" />
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Subscriber</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-12 text-center"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-5 w-5 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No matching subscribers</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubscribers.map((sub, index) => (
                      <motion.tr
                        key={sub.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: Math.min(index * 0.03, 0.5),
                          ease: [0.25, 0.4, 0.25, 1],
                        }}
                        className="group border-b border-border/40 hover:bg-gradient-to-r hover:from-blue-600/[0.03] hover:to-transparent transition-colors duration-200"
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <motion.div
                              whileHover={{ scale: 1.08 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm group-hover:ring-blue-600/10 transition-all duration-200">
                                <AvatarImage src={sub.image ?? undefined} />
                                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-600/15 to-blue-500/15 text-blue-800 dark:text-blue-300">
                                  {getInitials(sub.name)}
                                </AvatarFallback>
                              </Avatar>
                            </motion.div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">{sub.name}</p>
                              <p className="text-xs text-muted-foreground/70 truncate">
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
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-[11px]"
                                : sub.status === "CANCELLED"
                                  ? "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 font-medium text-[11px]"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium text-[11px]"
                            }
                          >
                            {sub.status === "ACTIVE" && (
                              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {sub.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">
                          ₹{(sub.monthlyAmount ?? 0).toFixed(2)}
                          <span className="text-muted-foreground/60 font-normal">/mo</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(sub.subscriptionDate)}
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </FadeIn>

      {/* Footer count */}
      <FadeIn direction="up" delay={0.4}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground/70">
            Showing <span className="font-medium text-muted-foreground">{filteredSubscribers.length}</span> of <span className="font-medium text-muted-foreground">{subscribers.length}</span> subscribers
          </p>
          {searchQuery && filteredSubscribers.length !== subscribers.length && (
            <button
              onClick={() => setSearchQuery("")}
              className="cursor-pointer text-xs text-blue-700 dark:text-blue-400 hover:underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
        </div>
      </FadeIn>
    </PageTransition>
  );
}
