"use client";

import { useEffect, useRef, useState } from "react";
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

  const [pending, setPending] = useState<{ subscriptionId: string; tier: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const requestInFlight = useRef(false);
  const verificationInFlight = useRef(false);
  const pendingKey = `experthub-pending-payment:${expertId}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(pendingKey) || "null");
      setPending(saved && typeof saved.subscriptionId === "string" && ["STANDARD", "PREMIUM"].includes(saved.tier) ? saved : null);
    } catch { setPending(null); }
  }, [pendingKey]);

  const rememberPending = (value: { subscriptionId: string; tier: string }) => {
    setPending(value);
    try { localStorage.setItem(pendingKey, JSON.stringify(value)); } catch { /* Keep in-memory retry available. */ }
  };

  const refreshPayment = async (value = pending) => {
    if (!value || verificationInFlight.current) return;
    verificationInFlight.current = true;
    setChecking(true);
    try {
      // Read-only verification waits for the signed confirmed-charge transaction.
      // Retrying this endpoint never creates a subscription or initiates a charge.
      const response = await fetch("/api/payments/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razorpaySubscriptionId: value.subscriptionId }),
      });
      if (!response.ok) throw new Error("Payment status is unavailable. Try checking again.");
      const result = await response.json();
      if (result.verified === true) {
        setPending(null);
        try { localStorage.removeItem(pendingKey); } catch { /* Verification is authoritative. */ }
        toast.success("Payment confirmed. Your subscription is active.");
        onSubscribe(value.tier, true);
        onClose();
      } else {
        setStatusMessage("Confirmation is still pending. You can check again later. Do not pay again for this subscription.");
      }
    } catch {
      setStatusMessage("Payment status is unavailable. Your pending checkout is saved. Check again when you are online; do not pay again.");
    } finally {
      verificationInFlight.current = false;
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !pending) return;
    void refreshPayment(pending);
    // A bounded initial refresh window; pending state and manual retry remain afterward.
    const interval = setInterval(() => { void refreshPayment(pending); }, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 30000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
    // The saved subscription identity controls this polling cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pending?.subscriptionId]);

  const handleSelect = async (tier: string) => {
    if (requestInFlight.current || pending) return;
    requestInFlight.current = true;
    setIsLoading(tier);

    if (tier === "FREE") {
      try {
        const res = await fetch(`/api/experts/${expertId}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: "FREE" }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to subscribe");
        }

        const data = await res.json();
        toast.success(`You are now following ${expertName}!`);
        onSubscribe(tier, data.isSubscribed);
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to subscribe. Please try again.");
      } finally {
        setIsLoading(null);
        requestInFlight.current = false;
      }
      return;
    }

    // Paid tier — create Razorpay subscription
    try {
      const res = await fetch("/api/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId, tier }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create subscription");
      }

      const data = await res.json();
      if (typeof data.subscriptionId !== "string" || !data.subscriptionId) throw new Error("Invalid checkout response");
      rememberPending({ subscriptionId: data.subscriptionId, tier });
      setStatusMessage("Checkout created. Payment confirmation is pending.");

      // Load Razorpay checkout
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');

      const openCheckout = () => {
        const options = {
          key: data.razorpayKeyId,
          subscription_id: data.subscriptionId,
          name: "ExpertHub",
          description: `${data.expertName} - Premium Plan`,
          handler: () => {
            setIsLoading(null);
            requestInFlight.current = false;
            setStatusMessage("Checkout completed. Waiting for confirmed payment before activating access.");
            toast.info("Checkout completed. Payment confirmation is pending.");
            // The provider callback is not proof of a captured charge.
            void refreshPayment({ subscriptionId: data.subscriptionId, tier });
          },
          modal: {
            ondismiss: () => {
              setIsLoading(null);
              requestInFlight.current = false;
              setStatusMessage("Checkout closed. Check its payment status before starting another payment.");
            },
          },
          theme: {
            color: "#4F46E5",
          },
        };

        const rzp = new (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay(options);
        rzp.open();
        // Loading is cleared by completion/dismissal; pending identity remains until verification.
      };

      if (existingScript) {
        openCheckout();
      } else {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = openCheckout;
        script.onerror = () => {
          setIsLoading(null);
          requestInFlight.current = false;
          setStatusMessage("Payment gateway could not load. Check the saved subscription status before paying again.");
        };
        document.body.appendChild(script);
      }
      // Do NOT have a finally block here — loading is managed by Razorpay modal callbacks
    } catch (e) {
      setIsLoading(null);
      requestInFlight.current = false;
      toast.error(e instanceof Error ? e.message : "Failed to subscribe. Please try again.");
    }
  };

  // Sort and filter to active tiers: FREE, PREMIUM
  const tierOrder = ["FREE", "PREMIUM"];
  const sortedTiers = [...tiers]
    .filter((t) => tierOrder.includes(t.tier))
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto p-4 sm:max-w-xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl">
            Subscribe to {expertName}
          </DialogTitle>
          <p className="text-center text-xs sm:text-sm text-muted-foreground">
            Choose the plan that works best for you
          </p>
        </DialogHeader>

        {pending && (
          <div role="status" className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Payment confirmation pending</p>
            <p>{statusMessage || "A saved checkout is awaiting confirmation. Check its status before paying again."}</p>
            <Button className="mt-2" variant="outline" disabled={checking} onClick={() => void refreshPayment()}>
              {checking ? "Checking payment status…" : "Check payment status"}
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2 sm:gap-4 sm:py-4">
          {sortedTiers.map((t) => {
            const Icon = tierIcons[t.tier] || User;
            const isPremium = t.tier === "PREMIUM";
            const isCurrent = currentTier === t.tier;

            return (
              <div
                key={t.tier}
                className={cn(
                  "relative flex flex-col rounded-lg border p-4 sm:p-5",
                  isPremium
                    ? "border-primary shadow-md"
                    : "border-border",
                  isCurrent && "ring-2 ring-primary"
                )}
              >
                {isPremium && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                    Most Popular
                  </Badge>
                )}

                <div className="mb-2 flex items-center gap-2 sm:mb-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 sm:h-5 sm:w-5",
                      t.tier === "FREE" && "text-muted-foreground",
                      t.tier === "STANDARD" && "text-blue-500",
                      t.tier === "PREMIUM" && "text-amber-500"
                    )}
                  />
                  <h3 className="text-sm font-semibold sm:text-base">{t.tier === "FREE" ? "Free" : t.tier === "STANDARD" ? "Standard" : "Premium"}</h3>
                </div>

                <div className="mb-2 sm:mb-4">
                  <span className="text-2xl font-bold sm:text-3xl">
                    {t.price > 0 ? `₹${t.price.toFixed(2)}` : "Free"}
                  </span>
                  {t.price > 0 && <span className="text-xs sm:text-sm text-muted-foreground">/mo</span>}
                </div>

                {t.description && (
                  <p className="mb-2 text-xs text-muted-foreground sm:mb-3 sm:text-sm">
                    {t.description}
                  </p>
                )}

                <ul className="mb-4 flex-1 space-y-1.5 sm:mb-6 sm:space-y-2">
                  {t.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs sm:gap-2 sm:text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPremium ? "default" : "outline"}
                  className="w-full"
                  size="sm"
                  disabled={isCurrent || isLoading !== null || pending !== null}
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
