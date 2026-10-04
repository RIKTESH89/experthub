"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/motion";
import { SubscriberHeading } from "@/components/subscriber/page-heading";
import styles from "@/components/subscriber/subscriber-studio.module.css";

export default function SubscriberSubscriptionsPage() {
  const [summary, setSummary] = useState<{ activeCount:number; totalMonthly:number } | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/subscriptions");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        const subs = Array.isArray(data) ? data : data.subscriptions ?? [];
        const active = subs.filter((s: { status:string }) => s.status === "ACTIVE");
        setSummary({ activeCount:active.length, totalMonthly:active.reduce((sum:number,s:{ monthlyPrice?:number }) => sum+(s.monthlyPrice ?? 0),0) });
      } catch { setSummaryError(true); }
    }
    fetchSummary();
  }, []);
  return <PageTransition className={styles.page}>
    <SubscriberHeading section="Your library / Plans" title="Subscriptions" description="Review your expert plans and the access available with each subscription.">
      <Button variant="outline" asChild><Link href="/subscriber/hub">Discover experts</Link></Button>
    </SubscriberHeading>
    {summaryError ? <p className={styles.note} role="status">Your plan summary could not be loaded. Check the subscription list below.</p> : summary === null ? <Skeleton className="h-28 w-full mb-8" /> :
      <div className={styles.summary}><div><p>Active plans</p><strong>{summary.activeCount}</strong></div><div><p>Monthly plan total</p><strong>₹{summary.totalMonthly.toFixed(2)}</strong><small>/ month</small></div></div>}
    <section aria-label="Your subscriptions"><SubscriptionList /></section>
  </PageTransition>;
}
