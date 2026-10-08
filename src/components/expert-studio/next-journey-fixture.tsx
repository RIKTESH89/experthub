"use client";
// Development-only role presentation: client SessionProvider receives an explicit synthetic
// session. Server role layouts are tested separately with mocked auth. No sign-in cookie,
// auth bypass, identity grant, database, provider, native picker or upload storage is used.
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { useTheme } from "next-themes";
import { navByRole } from "@/config/nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import SubscriberProfilePage from "@/app/(dashboard)/subscriber/profile/page";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import { KnowledgeTable } from "@/components/knowledge/knowledge-table";
import { UserTable } from "@/components/admin/user-table";

type Role = "SUBSCRIBER" | "EXPERT" | "ADMIN";
export function NextJourneyFixture() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>("SUBSCRIBER");
  const [view, setView] = useState("form");
  const [expertDraft, setExpertDraft] = useState({id:"synthetic-source",title:"Synthetic source",content:"Synthetic populated source material",sourceType:"manual" as const});
  const [requests, setRequests] = useState<string[]>([]);
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    const original = window.fetch;
    let readAttempt = 0, profileAttempt = 0, knowledgeAttempt = 0, deleteAttempt = 0;
    let profile = {name:"Synthetic subscriber",email:"subscriber@example.invalid",headline:"Local fixture",bio:"Synthetic populated subscriber details",image:null};
    let knowledge = [{id:"synthetic-source",title:"Synthetic source",content:"Synthetic populated source material",sourceType:"manual",isIndexed:false,createdAt:new Date().toISOString()}];
    let users = [{id:"synthetic-reader",name:"Synthetic reader",email:"reader@example.invalid",role:"SUBSCRIBER",isActive:true,isBanned:false,createdAt:new Date().toISOString()}];
    const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
    window.fetch = async (input, options) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      const method = options?.method || "GET";
      if (url.origin !== window.location.origin) throw new Error("Synthetic fixture blocks external requests");
      if (!url.pathname.startsWith("/api/")) return original(input, options);
      await new Promise(resolve=>setTimeout(resolve,method === "GET" ? 50 : 500));
      if (options?.signal?.aborted) throw new DOMException("Aborted","AbortError");
      setRequests(previous=>[...previous.slice(-11),`${method} ${url.pathname}`]);
      // The root provider may refresh on browser focus; it remains anonymous.
      if (url.pathname === "/api/auth/session" && method === "GET") return json(null);
      if (url.pathname === "/api/notifications") return json({notifications:[]});
      if (url.pathname === "/api/users/me") {
        if (method === "GET") return ++readAttempt === 1 ? json({error:"Synthetic profile load failure"},503) : json(profile);
        if (method === "PATCH") {
          if (++profileAttempt === 1) return json({error:"Synthetic save failure"},503);
          profile={...profile,...JSON.parse(String(options?.body))};return json(profile);
        }
      }
      if (url.pathname === "/api/knowledge") return json({items:knowledge});
      if (url.pathname === "/api/knowledge/synthetic-source" && method === "PATCH") {
        if (++knowledgeAttempt === 1) return json({error:"Synthetic permission failure"},403);
        knowledge=[{...knowledge[0],...JSON.parse(String(options?.body))}];setExpertDraft({id:"synthetic-source",title:knowledge[0].title,content:knowledge[0].content,sourceType:"manual"});return json(knowledge[0]);
      }
      if (url.pathname === "/api/admin/users") return json({users});
      if (url.pathname === "/api/admin/users/synthetic-reader" && method === "DELETE") {
        if (++deleteAttempt === 1) return json({error:"Synthetic deletion denial"},403);
        users=[];return json({success:true});
      }
      return json({error:"Synthetic fixture: operation unavailable"},403);
    };
    setReady(true);
    return () => { window.fetch=original; };
  }, []);
  const session={user:{id:`synthetic-${role.toLowerCase()}`,role,name:`Synthetic ${role.toLowerCase()}`,email:`${role.toLowerCase()}@example.invalid`,image:null},expires:"2099-01-01T00:00:00.000Z"};
  return <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false}>
    <div className="space-y-4 bg-background p-4 text-foreground">
      <h1 className="text-xl">Synthetic session journey review</h1>
      <p>Client authenticated presentation only; no real role session or server authorization bypass. Actual role layouts have separate mocked-auth tests. All requests below return in-memory synthetic data. No native picker, storage or provider is exercised.</p>
      <div className="flex flex-wrap gap-2">{(["SUBSCRIBER","EXPERT","ADMIN"] as const).map(value=><Button key={value} aria-pressed={role === value} variant="outline" onClick={()=>{setRole(value);setView("form");}}>{value}</Button>)}<Button variant="outline" onClick={()=>setTheme(resolvedTheme === "dark" ? "light" : "dark")}>Toggle fixture theme</Button></div>
      <div className="studio-workspace flex min-h-[720px] border">
        <Sidebar navItems={navByRole[role]} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar navItems={navByRole[role]} />
          <main className="min-w-0 p-4">
            {!ready ? <p role="status">Preparing fixture…</p> : role === "SUBSCRIBER" ? <SubscriberProfilePage key={role} /> : role === "ADMIN" ? <UserTable key={role} /> : view === "library" ? <div className="space-y-4"><h2>Synthetic source library</h2><KnowledgeTable onEdit={()=>setView("form")} /></div> : <KnowledgeForm key={role} initialData={expertDraft} onCancel={()=>setView("library")} onSuccess={()=>setView("library")} />}
          </main>
        </div>
      </div>
      <details><summary>Synthetic request log</summary><pre className="overflow-auto text-xs">{requests.join("\n")}</pre></details>
    </div>
  </SessionProvider>;
}
