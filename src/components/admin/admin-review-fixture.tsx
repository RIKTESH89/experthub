"use client";

import { useMemo, useState } from "react";
import { AdminAnalyticsWorkspace } from "./analytics-workspace";
import { AdminApplicationsWorkspace, type Application } from "./applications-workspace";

// This component is rendered only by the existing development-only fixture route.
// All requests terminate in this in-memory transport; no API or role mutation occurs.
export function AdminReviewFixture({ view }: { view: "Analytics" | "Applications" }) {
  const [scenario, setScenario] = useState("populated");
  const [revision, setRevision] = useState(0);
  const [requests, setRequests] = useState<string[]>([]);
  const transport = useMemo(() => {
    const application: Application = { id: "synthetic-application", name: "Sam Example — synthetic applicant with a long display name for mobile review", email: "synthetic.applicant.with.long.address@example.invalid", specialty: "Knowledge systems and team learning", reason: "Synthetic application for local confirmation review only.", createdAt: "2026-10-07T00:00:00Z", status: "PENDING" };
    return (async (input, init) => {
      const path = String(input);
      const method = init?.method ?? "GET";
      setRequests(previous => [...previous, `${method} ${path} · fixture reset ${revision}`]);
      if (scenario === "loading" || (scenario === "pending" && method === "PATCH")) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 30000);
          init?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Aborted")); }, { once: true });
        });
      }
      const failed = scenario === "error" || (scenario === "approval-error" && method === "PATCH");
      const denied = scenario === "denied";
      const status = denied ? 403 : failed ? 500 : 200;
      let body: unknown;
      if (failed || denied) body = { error: denied ? "Administrator access required." : "Synthetic service failure." };
      else if (path === "/api/admin/analytics") body = scenario === "malformed" ? { totalUsers: 10 } : { totalUsers: scenario === "empty" ? 0 : 12, activeExperts: scenario === "empty" ? 0 : 3, totalSubscribers: scenario === "empty" ? 0 : 5, activeSubscriptions: scenario === "empty" ? 0 : 4, totalPosts: scenario === "empty" ? 0 : 21, postsPerDay: scenario === "empty" ? {} : { "2026-10-05": 2, "2026-10-06": 3 } };
      else if (method === "PATCH") {
        const action = JSON.parse(String(init?.body)).action;
        application.status = action === "approve" ? "APPROVED" : "REJECTED";
        body = { status: application.status };
      } else body = { applications: scenario === "empty" ? [] : [{ ...application }] };
      return { ok: status === 200, status, json: async () => body } as Response;
    }) as typeof fetch;
    // Each selection/reset creates a fresh, isolated synthetic application.
  }, [scenario, revision]);
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <label className="block text-sm">Synthetic scenario <select className="ml-2 rounded border bg-background p-2" aria-label="Synthetic scenario" value={scenario} onChange={event => { setRequests([]); setScenario(event.target.value); }}>
      {["populated", "empty", "loading", "error", "malformed", "denied", "approval-error", "pending"].map(value => <option key={value}>{value}</option>)}
    </select></label>
    <button className="rounded border p-2 text-sm" onClick={() => { setRequests([]); setRevision(previous => previous + 1); }}>Reset synthetic data</button>
    {view === "Analytics" ? <AdminAnalyticsWorkspace key={`${scenario}-${revision}`} transport={transport} /> : <AdminApplicationsWorkspace key={`${scenario}-${revision}`} transport={transport} />}
    <aside className="break-all rounded border p-4 text-sm" aria-label="Synthetic request trace"><p>No server API calls. In-memory request trace:</p><ol>{requests.map((request, index) => <li key={index}>{request}</li>)}</ol></aside>
  </main>;
}
