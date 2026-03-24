"use client";

import { SubscriptionList } from "@/components/subscriptions/subscription-list";

export default function SubscriberSubscriptionsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Subscriptions</h2>
        <p className="text-sm text-muted-foreground">Your active plans</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/30 px-4 py-2.5 text-sm overflow-x-auto">
        <span>
          <span className="font-medium text-green-600">●</span> 3 active
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">$29.97/mo total</span>
      </div>
      <SubscriptionList />
    </div>
  );
}
