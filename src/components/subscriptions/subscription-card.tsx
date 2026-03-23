import Link from "next/link";
import {
  MessageCircle,
  Calendar,
  CreditCard,
  MoreHorizontal,
} from "lucide-react";
import { cn, getInitials, formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Subscription {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  monthlyPrice: number;
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
  ACTIVE: { label: "Active", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  CANCELLED: { label: "Cancelled", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  EXPIRED: { label: "Expired", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  PAST_DUE: { label: "Past Due", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
};

export function SubscriptionCard({
  subscription,
  onCancel,
}: SubscriptionCardProps) {
  const status = statusConfig[subscription.status];

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <Link href={`/subscriber/experts/${subscription.expert.id}`}>
          <Avatar className="h-12 w-12 ring-2 ring-transparent transition-all hover:ring-primary/20">
            <AvatarImage
              src={subscription.expert.image ?? undefined}
              alt={subscription.expert.displayName}
            />
            <AvatarFallback>
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
            <Badge variant="secondary" className={cn("text-[10px]", status.className)}>
              {status.label}
            </Badge>
          </div>
          {subscription.expert.headline && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subscription.expert.headline}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              ${(subscription.monthlyPrice ?? 0).toFixed(2)}/mo
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Since {formatDate(subscription.startDate)}
            </span>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/subscriber/experts/${subscription.expert.id}/chat`}>
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              Chat
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/subscriber/experts/${subscription.expert.id}`}>
                  View Profile
                </Link>
              </DropdownMenuItem>
              {subscription.status === "ACTIVE" && onCancel && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onCancel(subscription.id)}
                >
                  Cancel Subscription
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
