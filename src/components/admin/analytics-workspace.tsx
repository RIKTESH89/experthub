"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

// Missing summary data is unavailable, never a zero or an invented trend.
// subscriptionRevenue sums active subscription prices; it is not cash revenue.
const count = z.number().int().nonnegative();
export const adminAnalyticsSummarySchema = z.object({
  totalUsers: count,
  activeExperts: count,
  totalSubscribers: count,
  activeSubscriptions: count,
  totalPosts: count,
  postsPerDay: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), count),
});
export type AdminAnalyticsSummary = z.infer<typeof adminAnalyticsSummarySchema>;

export function AdminAnalyticsWorkspace({ transport = fetch }: { transport?: typeof fetch }) {
  const [data, setData] = useState<AdminAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (activeRequest.current && !activeRequest.current.signal.aborted) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const response = await transport("/api/admin/analytics", { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403
        ? "Sign in with an administrator account to view analytics."
        : "The platform summary could not be loaded. Try again.");
      const result = adminAnalyticsSummarySchema.safeParse(await response.json());
      if (!result.success) throw new Error("The platform summary is incomplete or unavailable. Try again.");
      if (!controller.signal.aborted) setData(result.data);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "The platform summary could not be loaded. Try again.");
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
  }, [transport]);

  useEffect(() => {
    void load();
    return () => activeRequest.current?.abort();
  }, [load]);

  const metrics = data ? [
    ["User accounts", data.totalUsers, "All account statuses"],
    ["Active expert accounts", data.activeExperts, "Expert accounts marked active"],
    ["Subscriber accounts", data.totalSubscribers, "All subscriber account statuses"],
    ["Subscriptions marked active", data.activeSubscriptions, "Subscription records; access is checked separately"],
    ["Posts", data.totalPosts, "All post statuses"],
  ] as const : [];
  const postDays = data ? Object.entries(data.postsPerDay).sort(([a], [b]) => a.localeCompare(b)) : [];

  return <section className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-medium tracking-tight">Platform analytics</h1><p className="mt-2 text-sm text-muted-foreground">Account and content summary from platform records.</p></div>
      <Button variant="outline" disabled={loading} onClick={() => void load()}>Refresh summary</Button>
    </header>
    {loading ? <p role="status" className="rounded-lg border bg-card p-5">Loading platform summary…</p>
      : error ? <div role="alert" className="space-y-2 rounded-lg border bg-card p-5"><h2 className="text-lg font-semibold">Analytics unavailable</h2><p>{error}</p></div>
      : data ? <>
        {metrics.every(([, value]) => value === 0) && <p role="status" className="rounded-lg border bg-card p-5">No accounts, subscriptions or posts are recorded yet.</p>}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value, detail]) => <div key={label} className="rounded-lg border bg-card p-5"><dt className="font-medium">{label}</dt><dd className="mt-3 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</dd><dd className="mt-2 text-sm text-muted-foreground">{detail}</dd></div>)}</dl>
        <section className="space-y-3" aria-labelledby="recent-posts-heading">
          <h2 id="recent-posts-heading" className="text-xl font-semibold">Posts created in the last 30 days</h2>
          {postDays.length === 0 ? <p className="rounded-lg border bg-card p-5">No posts recorded in this period.</p>
            : <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><caption className="sr-only">Recorded post totals by date</caption><thead className="bg-muted"><tr><th scope="col" className="p-4">Date (UTC)</th><th scope="col" className="p-4">Posts created</th></tr></thead><tbody>{postDays.map(([day, total]) => <tr key={day} className="border-t"><th scope="row" className="p-4 font-normal">{day}</th><td className="p-4 tabular-nums">{total.toLocaleString()}</td></tr>)}</tbody></table></div>}
        </section>
      </> : null}
    <section className="space-y-2 rounded-lg border bg-card p-5" aria-labelledby="unavailable-reports-heading">
      <h2 id="unavailable-reports-heading" className="text-lg font-semibold">Additional reports unavailable</h2>
      <p className="text-sm text-muted-foreground">Annual user growth, daily active users, complete role distribution and expert rankings are not provided by the current summary.</p>
      <p className="text-sm text-muted-foreground">Revenue reporting is unavailable: the summary does not provide confirmed payment totals, currency or a revenue history.</p>
    </section>
  </section>;
}
