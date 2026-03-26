"use client";

import { useState } from "react";
import { Crown, Star, User, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PricingTier {
  id: string;
  tier: "FREE" | "STANDARD" | "PREMIUM";
  price: number;
  description?: string | null;
  monthlyQuestions?: number | null;
  features: string[];
}

interface TierSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expertId: string;
  expertName: string;
  tiers: PricingTier[];
  currentTier?: string | null;
  onSubscribe: (tier: string, isSubscribed: boolean) => void;
}

const tierIcons = {
  FREE: User,
  STANDARD: Star,
  PREMIUM: Crown,
};

const tierButtonLabels = {
  FREE: "Follow Free",
  STANDARD: "Subscribe",
  PREMIUM: "Go Premium",
};

export function TierSelectionDialog({
  isOpen,
  onClose,
  expertId,
  expertName,
  tiers,
  currentTier,
  onSubscribe,
}: TierSelectionDialogProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSelect = async (tier: string) => {
    setIsLoading(tier);
    try {
      const res = await fetch(`/api/experts/${expertId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) throw new Error("Failed to subscribe");

      const data = await res.json();
      toast.success(
        tier === "FREE"
          ? `You are now following ${expertName}!`
          : `Subscribed to ${expertName} (${tier})!`
      );
      onSubscribe(tier, data.isSubscribed);
      onClose();
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  // Sort and filter to active tiers: FREE, PREMIUM
  const tierOrder = ["FREE", "PREMIUM"];
  const sortedTiers = [...tiers]
    .filter((t) => tierOrder.includes(t.tier))
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Subscribe to {expertName}
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            Choose the plan that works best for you
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          {sortedTiers.map((t) => {
            const Icon = tierIcons[t.tier] || User;
            const isPremium = t.tier === "PREMIUM";
            const isCurrent = currentTier === t.tier;

            return (
              <div
                key={t.tier}
                className={cn(
                  "relative flex flex-col rounded-lg border p-5",
                  isPremium
                    ? "border-primary shadow-md"
                    : "border-border",
                  isCurrent && "ring-2 ring-primary"
                )}
              >
                {isPremium && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}

                <div className="mb-3 flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      t.tier === "FREE" && "text-muted-foreground",
                      t.tier === "STANDARD" && "text-blue-500",
                      t.tier === "PREMIUM" && "text-amber-500"
                    )}
                  />
                  <h3 className="font-semibold">{t.tier === "FREE" ? "Free" : t.tier === "STANDARD" ? "Standard" : "Premium"}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    ${t.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>

                {t.description && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                )}

                <ul className="mb-6 flex-1 space-y-2">
                  {t.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPremium ? "default" : "outline"}
                  className="w-full"
                  disabled={isCurrent || isLoading !== null}
                  onClick={() => handleSelect(t.tier)}
                >
                  {isLoading === t.tier ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    tierButtonLabels[t.tier]
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
