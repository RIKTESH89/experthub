"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import styles from "@/components/subscriber/subscriber-studio.module.css";
import { CreditCard } from "lucide-react";
import { SubscriptionCard } from "./subscription-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

interface Subscription {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "PAST_DUE" | "PENDING";
  monthlyPrice: number;
  tier?: "FREE" | "STANDARD" | "PREMIUM";
  startDate: string;
  hasAccess?: boolean;
  currentPeriodEnd?: string | null;
  renewalCancelled?: boolean;
  expert: {
    id: string;
    displayName: string;
    image?: string | null;
    headline?: string | null;
  };
}

export function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    setIsLoading(true);
    setLoadError(false);
    async function fetchSubscriptions() {
      try {
        const res = await fetch("/api/subscriptions", { signal: request.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!request.signal.aborted) setSubscriptions(data.subscriptions ?? data);
      } catch {
        if (request.signal.aborted) return;
        setLoadError(true);
        toast.error("Failed to load subscriptions");
      } finally {
        if (!request.signal.aborted) setIsLoading(false);
      }
    }
    fetchSubscriptions();
    return () => request.abort();
  }, [attempt]);

  const handleCancel = useCallback(async (subscriptionId: string) => {
    const subscription = subscriptions.find((sub) => sub.id === subscriptionId);
    if (!subscription) return;

    try {
      // Use the payment cancel API which handles both Razorpay and free subscriptions
      const res = await fetch("/api/payments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      if (!res.ok) throw new Error("Failed to cancel");

      const result = await res.json();
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === subscriptionId
            ? { ...sub, status: "CANCELLED" as const, hasAccess: result.hasAccess, currentPeriodEnd: result.currentPeriodEnd, renewalCancelled: true }
            : sub
        )
      );
      toast.success(result.hasAccess ? "Renewal cancelled. Access continues through your paid period." : "Subscription cancelled");
    } catch {
      toast.error("Failed to cancel subscription");
    }
  }, [subscriptions]);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading subscriptions" className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (loadError) return <div className={styles.notice} role="alert"><strong>Subscriptions could not be loaded</strong><p>Try again to review your plans and access.</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Try again</Button></div>;

  if (subscriptions.length === 0) {
    return (
      <div><EmptyState
        icon={CreditCard}
        title="No subscriptions yet"
        description="Subscribe to experts to access their AI twins and exclusive content."
      /><div className="flex justify-center pb-8"><Button variant="outline" asChild><Link href="/subscriber/hub">Discover experts</Link></Button></div></div>
    );
  }

  return (
    <div className="space-y-3">
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription.id}
          subscription={subscription}
          onCancel={handleCancel}
        />
      ))}
    </div>
  );
}
