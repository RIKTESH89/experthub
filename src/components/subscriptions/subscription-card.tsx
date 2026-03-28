"use client";

import Link from "next/link";
import { MessageSquare, User, Crown, Star, Zap } from "lucide-react";
import { motion } from "motion/react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

interface SubscriptionCardProps {
  subscription: Subscription;
  onCancel?: (subscriptionId: string) => void;
  index?: number;
}

const statusConfig: Record<
  string,
  { label: string; dotClass: string; textClass: string; bgClass: string; borderClass: string }
> = {
  ACTIVE: {
    label: "Active",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-l-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    dotClass: "bg-gray-400",
    textClass: "text-gray-500 dark:text-gray-400",
    bgClass: "bg-gray-400/10",
    borderClass: "border-l-gray-400",
  },
  EXPIRED: {
    label: "Expired",
    dotClass: "bg-red-500",
    textClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
    borderClass: "border-l-red-500",
  },
  PAST_DUE: {
    label: "Past Due",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-l-amber-500",
  },
  PENDING: {
    label: "Pending",
    dotClass: "bg-blue-700",
    textClass: "text-blue-700 dark:text-blue-400",
    bgClass: "bg-blue-700/10",
    borderClass: "border-l-blue-700",
  },
};

const tierConfig: Record<string, { icon: typeof Crown; color: string; bg: string }> = {
  FREE: { icon: Zap, color: "text-slate-500", bg: "bg-white" },
  STANDARD: { icon: Star, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-700/10" },
  PREMIUM: { icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10" },
};

export function SubscriptionCard({
  subscription,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCancel,
  index = 0,
}: SubscriptionCardProps) {
  const status = statusConfig[subscription.status] ?? statusConfig.ACTIVE;
  const isInactive =
    subscription.status === "CANCELLED" || subscription.status === "EXPIRED";
  const tier = subscription.tier
    ? tierConfig[subscription.tier] ?? tierConfig.FREE
    : null;
  const TierIcon = tier?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: [0.25, 0.4, 0.25, 1] }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden border-l-4 transition-all duration-200",
          "hover:shadow-md",
          status.borderClass
        )}
      >
        <CardContent className="relative flex items-center gap-3.5 p-3.5">
          <Link
            href={`/subscriber/experts/${subscription.expert.id}`}
            className="shrink-0 cursor-pointer"
          >
            <Avatar className="h-11 w-11 ring-1 ring-border/50 transition-all duration-200 group-hover:ring-blue-700/20">
              <AvatarImage
                src={subscription.expert.image ?? undefined}
                alt={subscription.expert.displayName}
              />
              <AvatarFallback className="bg-blue-50 text-xs font-semibold font-sans text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                {getInitials(subscription.expert.displayName)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/subscriber/experts/${subscription.expert.id}`}
                className="cursor-pointer truncate text-sm font-semibold font-sans transition-colors duration-200 hover:text-blue-700 dark:hover:text-blue-400"
              >
                {subscription.expert.displayName}
              </Link>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5",
                  status.bgClass
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      status.dotClass
                    )}
                  />
                  {subscription.status === "ACTIVE" && (
                    <span
                      className={cn(
                        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
                        status.dotClass
                      )}
                    />
                  )}
                </span>
                <span className={cn("text-[11px] font-medium font-sans", status.textClass)}>
                  {status.label}
                </span>
              </span>
            </div>
            {subscription.expert.headline && (
              <p className="mt-0.5 truncate text-xs font-sans text-slate-500">
                {subscription.expert.headline}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-sm font-semibold font-sans tabular-nums text-foreground">
              {subscription.monthlyPrice > 0
                ? `₹${subscription.monthlyPrice.toFixed(2)}`
                : "Free"}
            </span>
            {subscription.monthlyPrice > 0 && (
              <span className="text-[10px] font-sans text-slate-500">/month</span>
            )}
            {tier && TierIcon && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                  tier.bg
                )}
              >
                <TierIcon className={cn("h-3 w-3", tier.color)} />
                <span className={cn("text-[10px] font-medium font-sans", tier.color)}>
                  {subscription.tier!.charAt(0) + subscription.tier!.slice(1).toLowerCase()}
                </span>
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {isInactive ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer border-blue-700/20 text-xs font-medium font-sans text-blue-700 hover:bg-blue-700 hover:text-white dark:text-blue-400"
                asChild
              >
                <Link href={`/subscriber/experts/${subscription.expert.id}`}>
                  Resubscribe
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-blue-700/10 hover:text-blue-700"
                  asChild
                >
                  <Link
                    href={`/subscriber/experts/${subscription.expert.id}/chat`}
                    title="Chat"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-blue-700/10 hover:text-blue-700"
                  asChild
                >
                  <Link
                    href={`/subscriber/experts/${subscription.expert.id}`}
                    title="View Profile"
                  >
                    <User className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
