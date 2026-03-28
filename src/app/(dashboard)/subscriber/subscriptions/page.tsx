"use client";

import { useState, useEffect } from "react";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition, FadeIn, AnimatedCounter } from "@/components/ui/motion";

interface SubSummary {
  activeCount: number;
  totalMonthly: number;
}

export default function SubscriberSubscriptionsPage() {
  const [summary, setSummary] = useState<SubSummary | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/subscriptions");
        if (!res.ok) return;
        const data = await res.json();
        const subs = Array.isArray(data) ? data : [];
        const active = subs.filter((s: { status: string }) => s.status === "ACTIVE");
        setSummary({
          activeCount: active.length,
          totalMonthly: active.reduce((sum: number, s: { monthlyPrice?: number }) => sum + (s.monthlyPrice ?? 0), 0),
        });
      } catch {
        setSummary({ activeCount: 0, totalMonthly: 0 });
      }
    }
    fetchSummary();
  }, []);

  return (
    <PageTransition className="space-y-6 font-sans">
      {/* Page header */}
      <FadeIn delay={0.05}>
        <div className="relative overflow-hidden rounded-xl border bg-card px-6 py-5">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#1E40AF]" />
          <h2 className="text-2xl font-bold tracking-tight font-sans">Subscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track your active plans
          </p>
        </div>
      </FadeIn>

      {/* Summary stats */}
      <FadeIn delay={0.15}>
        {summary === null ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : summary.activeCount > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-colors duration-200 hover:bg-muted/30">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Active Plans
              </p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <AnimatedCounter
                  value={summary.activeCount}
                  className="text-2xl font-bold text-foreground font-sans"
                />
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-colors duration-200 hover:bg-muted/30">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1E40AF]/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Monthly Total
              </p>
              <p className="mt-1.5 text-2xl font-bold text-foreground font-sans">
                {summary.totalMonthly > 0 ? (
                  <>
                    <AnimatedCounter
                      value={summary.totalMonthly}
                      prefix="$"
                      className="text-2xl font-bold font-sans"
                    />
                    <span className="ml-0.5 text-sm font-normal text-muted-foreground">/mo</span>
                  </>
                ) : (
                  <span className="text-base font-medium text-muted-foreground">Free plans</span>
                )}
              </p>
            </div>
          </div>
        ) : null}
      </FadeIn>

      {/* Subscription list */}
      <FadeIn delay={0.25}>
        <div className="rounded-xl border bg-card">
          <SubscriptionList />
        </div>
      </FadeIn>
    </PageTransition>
  );
}
