"use client";
// Client presentation only. No auth cookie, account, provider or billing mutation.
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { useTheme } from "next-themes";
import { navByRole } from "@/config/nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import SubscriberSettingsPage from "@/app/(dashboard)/subscriber/settings/page";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
const session = {user:{id:"synthetic-subscriber",role:"SUBSCRIBER",name:"Synthetic subscriber",email:"subscriber@example.invalid",image:null},expires:"2099-01-01T00:00:00.000Z"};
export function ContinuationJourneyFixture() {
  const [ready,setReady] = useState(false);
  const [view,setView] = useState("settings");
  const [requests,setRequests] = useState<string[]>([]);
  const {resolvedTheme,setTheme} = useTheme();
  useEffect(()=>{
    const original = window.fetch;
    let active = true;
    let settingsRead = 0, settingsWrite = 0, planRead = 0;
    let preferences = {emailOnNewPost:false,emailOnReply:true,emailDigest:"weekly"};
    const plan = {id:"synthetic-plan",status:"ACTIVE",monthlyPrice:100,tier:"STANDARD",startDate:"2026-10-08",hasAccess:true,expert:{id:"synthetic-expert",displayName:"Synthetic expert with a long display name",headline:"Synthetic local plan"}};
    const plans = [plan,{...plan,id:"synthetic-renewal",status:"CANCELLED",renewalCancelled:true,currentPeriodEnd:"2099-11-08T00:00:00Z",expert:{...plan.expert,id:"synthetic-continuing",displayName:"Synthetic continuing expert"}},{...plan,id:"synthetic-ended",status:"EXPIRED",hasAccess:false,expert:{...plan.expert,id:"synthetic-ended-expert",displayName:"Synthetic expired expert"}}];
    const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
    window.fetch = async (input,options)=>{
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw,window.location.origin);
      const method = options?.method || "GET";
      if (url.origin !== window.location.origin) throw new Error("Synthetic fixture blocks external requests");
      if (!url.pathname.startsWith("/api/")) return original(input,options);
      await new Promise(resolve=>setTimeout(resolve,method === "GET" ? 50 : 800));
      if (!active || options?.signal?.aborted) throw new DOMException("Aborted","AbortError");
      setRequests(previous=>[...previous.slice(-11),`${method} ${url.pathname}`]);
      if (url.pathname === "/api/auth/session" && method === "GET") return json(null);
      if (url.pathname === "/api/notifications" && method === "GET") return json({notifications:[]});
      if (url.pathname === "/api/subscriber/settings") {
        if (method === "GET") return ++settingsRead === 1 ? json({error:"Synthetic load failure"},503) : json(preferences);
        if (method === "PATCH") {
          if (++settingsWrite === 1) return json({error:"Synthetic permission denial"},403);
          preferences = {...preferences,...JSON.parse(String(options?.body))};
          return json(preferences);
        }
      }
      if (url.pathname === "/api/subscriptions" && method === "GET") return ++planRead === 1 ? json({error:"Synthetic plan load failure"},503) : json(plans);
      return json({error:"Synthetic fixture: operation unavailable"},403);
    };
    setReady(true);
    return ()=>{active=false;window.fetch=original;};
  },[]);
  return <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false}>
    <div className="space-y-4 bg-background p-4 text-foreground">
      <h1 className="text-xl">Synthetic subscriber continuation review</h1>
      <p>Client session presentation only; no real authentication, email delivery, payment, account or access grant. Requests return in-memory synthetic data. Plan links target protected pages and do not provide a server session.</p>
      <div className="flex flex-wrap gap-2"><Button aria-pressed={view === "settings"} variant="outline" onClick={()=>setView("settings")}>Settings</Button><Button aria-pressed={view === "plans"} variant="outline" onClick={()=>setView("plans")}>Plans</Button><Button variant="outline" onClick={()=>setTheme(resolvedTheme === "dark" ? "light" : "dark")}>Toggle fixture theme</Button></div>
      <div className="studio-workspace flex min-h-[720px] border"><Sidebar navItems={navByRole.SUBSCRIBER} /><div className="flex min-w-0 flex-1 flex-col"><Navbar navItems={navByRole.SUBSCRIBER} /><main className="min-w-0 p-4">{!ready ? <p role="status">Preparing fixture…</p> : view === "settings" ? <SubscriberSettingsPage /> : <section aria-label="Synthetic subscriber plans"><h2 className="mb-4 text-xl">Your synthetic plans</h2><SubscriptionList /></section>}</main></div></div>
      <details><summary>Synthetic request log</summary><pre className="overflow-auto text-xs">{requests.join("\n")}</pre></details>
    </div>
  </SessionProvider>;
}
