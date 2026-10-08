"use client";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import styles from "@/components/subscriber/subscriber-studio.module.css";

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

interface SubscriptionCardProps {
  subscription: Subscription;
  onCancel?: (subscriptionId: string) => void;
  index?: number;
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const statusLabels = { ACTIVE:"Active", CANCELLED:"Cancelled", EXPIRED:"Expired", PAST_DUE:"Past due", PENDING:"Pending" };
  const label = subscription.renewalCancelled && subscription.hasAccess ? "Renewal cancelled" : statusLabels[subscription.status];
  const isInactive = subscription.hasAccess !== undefined ? !subscription.hasAccess : subscription.status !== "ACTIVE";
  return <article aria-label={`Subscription to ${subscription.expert.displayName}`} className={styles.subscription}>
    <Avatar className="h-14 w-14"><AvatarImage src={subscription.expert.image ?? undefined} alt={subscription.expert.displayName} /><AvatarFallback className="bg-accent text-primary">{getInitials(subscription.expert.displayName)}</AvatarFallback></Avatar>
    <div>
      <Link className={styles.subscriptionName} href={`/subscriber/experts/${subscription.expert.id}`}>{subscription.expert.displayName}</Link>
      {subscription.expert.headline && <p className="text-sm text-muted-foreground mt-1">{subscription.expert.headline}</p>}
      <div className={styles.subscriptionMeta}><span className="border border-border rounded-md px-2 py-1">{label}</span>{subscription.tier && <span>{subscription.tier.charAt(0)+subscription.tier.slice(1).toLowerCase()} plan</span>}</div>
      {subscription.renewalCancelled && subscription.hasAccess && subscription.currentPeriodEnd && <p className="text-sm text-muted-foreground mt-2">Access continues until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.</p>}
      <div className={styles.subscriptionActions}>
        {isInactive ? <Button variant="outline" asChild><Link href={`/subscriber/experts/${subscription.expert.id}`}>Resubscribe</Link></Button> : <Button variant="outline" asChild><Link aria-label={`Open AI conversation with ${subscription.expert.displayName}`} href={`/subscriber/experts/${subscription.expert.id}/chat`}>Open AI conversation</Link></Button>}
        <Button variant="ghost" asChild><Link aria-label={`View expert ${subscription.expert.displayName}`} href={`/subscriber/experts/${subscription.expert.id}`}>View expert</Link></Button>
      </div>
    </div>
    <div className={styles.price}>{subscription.monthlyPrice > 0 ? `₹${subscription.monthlyPrice.toFixed(2)}` : "Free"}{subscription.monthlyPrice > 0 && <small>/ month</small>}</div>
  </article>;
}
