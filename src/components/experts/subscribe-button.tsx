"use client";

import { useState, useCallback } from "react";
import { Loader2, Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TierSelectionDialog } from "./tier-selection-dialog";

interface PricingTier {
  id: string;
  tier: "FREE" | "STANDARD" | "PREMIUM";
  price: number;
  description?: string | null;
  monthlyQuestions?: number | null;
  features: string[];
}

interface SubscribeButtonProps {
  expertId: string;
  expertName?: string;
  monthlyPrice: number;
  isSubscribed: boolean;
  currentTier?: string | null;
  className?: string;
  onSubscriptionChange?: (subscribed: boolean) => void;
}

export function SubscribeButton({
  expertId,
  expertName,
  isSubscribed: initialSubscribed,
  currentTier: initialTier,
  className,
  onSubscriptionChange,
}: SubscribeButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [currentTier, setCurrentTier] = useState<string | null>(initialTier ?? null);

  const handleUnsubscribe = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/experts/${expertId}/subscribe`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to unsubscribe");
      const data = await res.json();
      setIsSubscribed(data.isSubscribed);
      setCurrentTier(null);
      toast.success("Unsubscribed successfully");
      onSubscriptionChange?.(data.isSubscribed);
    } catch {
      toast.error("Failed to unsubscribe");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, expertId, onSubscriptionChange]);

  const handleOpenTierDialog = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/experts/${expertId}/pricing`);
      if (!res.ok) throw new Error("Failed to fetch tiers");
      const data = await res.json();
      setTiers(data.tiers);
      setShowTierDialog(true);
    } catch {
      toast.error("Failed to load pricing options");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, expertId]);

  const handleSubscribeFromDialog = useCallback(
    (tier: string, subscribed: boolean) => {
      setIsSubscribed(subscribed);
      setCurrentTier(tier);
      onSubscriptionChange?.(subscribed);
    },
    [onSubscriptionChange]
  );

  if (isSubscribed) {
    return (
      <>
        <Button
          variant="outline"
          className={cn(
            "min-w-[140px] transition-all duration-200",
            isHovering &&
              "border-destructive text-destructive hover:bg-destructive/10",
            className
          )}
          onClick={handleUnsubscribe}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isHovering ? (
            "Unsubscribe"
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Subscribed
            </>
          )}
        </Button>

        <TierSelectionDialog
          isOpen={showTierDialog}
          onClose={() => setShowTierDialog(false)}
          expertId={expertId}
          expertName={expertName || "this expert"}
          tiers={tiers}
          currentTier={currentTier}
          onSubscribe={handleSubscribeFromDialog}
        />
      </>
    );
  }

  return (
    <>
      <Button
        className={cn("min-w-[140px]", className)}
        onClick={handleOpenTierDialog}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            View Plans
          </>
        )}
      </Button>

      <TierSelectionDialog
        isOpen={showTierDialog}
        onClose={() => setShowTierDialog(false)}
        expertId={expertId}
        expertName={expertName || "this expert"}
        tiers={tiers}
        currentTier={currentTier}
        onSubscribe={handleSubscribeFromDialog}
      />
    </>
  );
}
