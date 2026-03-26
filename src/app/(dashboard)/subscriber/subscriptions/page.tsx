"use client";

import { useState, useEffect } from "react";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Subscriptions</h2>
        <p className="text-sm text-muted-foreground">Your active plans</p>
      </div>
      {summary === null ? (
        <Skeleton className="h-10 w-64 rounded-lg" />
      ) : summary.activeCount > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/30 px-4 py-2.5 text-sm overflow-x-auto">
          <span>
            <span className="font-medium text-green-600">●</span> {summary.activeCount} active
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {summary.totalMonthly > 0
              ? `$${summary.totalMonthly.toFixed(2)}/mo total`
              : "Free plans"}
          </span>
        </div>
      ) : null}
      <SubscriptionList />
    </div>
  );
}
