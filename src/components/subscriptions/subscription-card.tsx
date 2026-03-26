import Link from "next/link";
import { MessageSquare, User } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Subscription {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
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
}

const statusConfig = {
  ACTIVE: {
    label: "Active",
    dotClass: "bg-green-500",
    textClass: "text-green-600 dark:text-green-400",
    borderClass: "border-l-green-500",
  },
  CANCELLED: {
    label: "Cancelled",
    dotClass: "bg-gray-400",
    textClass: "text-gray-500 dark:text-gray-400",
    borderClass: "border-l-gray-400",
  },
  EXPIRED: {
    label: "Expired",
    dotClass: "bg-red-500",
    textClass: "text-red-600 dark:text-red-400",
    borderClass: "border-l-red-500",
  },
};

export function SubscriptionCard({
  subscription,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCancel,
}: SubscriptionCardProps) {
  const status = statusConfig[subscription.status] ?? statusConfig.ACTIVE;
  const isInactive =
    subscription.status === "CANCELLED" || subscription.status === "EXPIRED";

  return (
    <Card
      className={cn(
        "border-l-4 transition-colors duration-200 hover:bg-muted/50",
        status.borderClass
      )}
    >
      <CardContent className="flex items-center gap-3 p-3">
        <Link
          href={`/subscriber/experts/${subscription.expert.id}`}
          className="shrink-0"
        >
          <Avatar className="h-10 w-10 transition-opacity hover:opacity-80">
            <AvatarImage
              src={subscription.expert.image ?? undefined}
              alt={subscription.expert.displayName}
            />
            <AvatarFallback className="text-xs">
              {getInitials(subscription.expert.displayName)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/subscriber/experts/${subscription.expert.id}`}
              className="truncate text-sm font-semibold hover:underline"
            >
              {subscription.expert.displayName}
            </Link>
            <span className="flex shrink-0 items-center gap-1">
              <span
                className={cn("inline-block h-2 w-2 rounded-full", status.dotClass)}
              />
              <span className={cn("text-[11px]", status.textClass)}>
                {status.label}
              </span>
            </span>
          </div>
          {subscription.expert.headline && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subscription.expert.headline}
            </p>
          )}
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">
          {subscription.monthlyPrice > 0
            ? `₹${subscription.monthlyPrice.toFixed(2)}/mo`
            : "Free"}
          {subscription.tier && (
            <span className="ml-1 text-[10px] text-muted-foreground/70">
              ({subscription.tier.charAt(0) + subscription.tier.slice(1).toLowerCase()})
            </span>
          )}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {isInactive ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href={`/subscriber/experts/${subscription.expert.id}`}>
                Resubscribe
              </Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
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
                className="h-8 w-8"
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
  );
}
