"use client";

import { useState, useEffect, useCallback } from "react";
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
  expert: {
    id: string;
    displayName: string;
    image?: string | null;
    headline?: string | null;
  };
}

export function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        const res = await fetch("/api/subscriptions");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSubscriptions(data.subscriptions ?? data);
      } catch {
        toast.error("Failed to load subscriptions");
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubscriptions();
  }, []);

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

      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === subscriptionId
            ? { ...sub, status: "CANCELLED" as const }
            : sub
        )
      );
      toast.success("Subscription cancelled");
    } catch {
      toast.error("Failed to cancel subscription");
    }
  }, [subscriptions]);

  if (isLoading) {
    return (
      <div className="space-y-3">
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

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No subscriptions yet"
        description="Subscribe to experts to access their AI twins and exclusive content."
      />
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
