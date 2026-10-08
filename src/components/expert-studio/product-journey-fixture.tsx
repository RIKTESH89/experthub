"use client";
// Development-only component harness. Requests below return synthetic DTOs in memory.
// It does not create a session, call an import service, or change access rules.
import { useEffect, useState } from "react";
import { PdfImportForm } from "@/components/knowledge/pdf-import-form";
import { ImportHistoryTable } from "@/components/knowledge/import-history-table";
import { UserTable } from "@/components/admin/user-table";
import WidgetPage from "@/app/(dashboard)/expert/widget/page";
import { PostFeed } from "@/components/posts/post-feed";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function ProductJourneyFixture() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("import");
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    const original = window.fetch;
    let pdfAttempt = 0, historyAttempt = 0, widgetAttempt = 0, adminAttempt = 0, subscriberAttempt = 0;
    let imported = false;
    let widget = { id: "synthetic-widget", apiKey: "synthetic-no-provider-key", isEnabled: false, primaryColor: "#6366f1", position: "bottom-right", greeting: "Synthetic local greeting", freeQuestions: 2, allowedDomains: ["example.invalid"], embedCode: '<script src="https://example.invalid/synthetic-only.js"></script>' };
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    window.fetch = async (input, options) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const pathname = new URL(url, window.location.origin).pathname;
      if (pathname === "/api/admin/users" || pathname === "/api/knowledge/import/history" || pathname === "/api/subscriber/bookmarks") {
        await new Promise(resolve => setTimeout(resolve, 50));
        if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      }
      if (pathname === "/api/widget/config") return json({primaryColor:"#365449",position:"bottom-right",greeting:"Synthetic configured-widget greeting",expertName:"Synthetic expert"});
      if (pathname === "/api/widget/chat") return json({error:"Synthetic fixture does not run AI responses"},503);
      if (url === "/api/knowledge/import/pdf") {
        if (++pdfAttempt === 1) return json({error:"Synthetic processing failure. Retry the selected file."},422);
        imported = true;
        return json({title:"Synthetic PDF source",fileName:"synthetic.pdf",numPages:2});
      }
      if (url.startsWith("/api/knowledge/import/history?")) {
        if (++historyAttempt === 1) return json({error:"Synthetic service unavailable"},503);
        return json({items:[{id:"synthetic-import",sourceType:"PDF",fileName:"synthetic.pdf",status:imported?"COMPLETED":"PROCESSING",itemsCreated:imported?1:0,errorMessage:null,createdAt:new Date(Date.now() - 60000).toISOString()}],page:1,limit:20,total:1,totalPages:1});
      }
      if (url === "/api/expert/widget") {
        if (options?.method === "PUT") {
          if (++widgetAttempt === 1) return json({error:"Synthetic save unavailable"},503);
          widget = {...widget,...JSON.parse(String(options.body))};
        }
        return json(widget);
      }
      if (url === "/api/admin/users") {
        if (++adminAttempt === 1) return json({error:"Synthetic role denial"},403);
        return json({users:[{id:"synthetic-reader",name:"Synthetic reader",email:"reader@example.invalid",role:"SUBSCRIBER",isActive:true,isBanned:false,createdAt:new Date(Date.now() - 60000).toISOString()}]});
      }
      if (url.startsWith("/api/subscriber/bookmarks?")) {
        if (++subscriberAttempt === 1) return json({error:"Synthetic reading shelf unavailable"},503);
        return json({posts:[{id:"synthetic-post",title:"Synthetic saved reading",content:"Synthetic long-form source note for subscriber recovery review. No expert claim or live content is loaded.",status:"PUBLISHED",isRagEnabled:false,isHidden:false,createdAt:new Date(Date.now() - 60000).toISOString(),author:{id:"synthetic-expert",name:"Synthetic expert",image:null},media:[],tags:["synthetic"],_count:{likes:0,comments:0,bookmarks:1},isLiked:false,isBookmarked:true}]});
      }
      if (pathname.startsWith("/api/posts/")) return json({error:"Synthetic fixture: mutations unavailable"},403);
      // Block administrative mutations in the harness even if someone clicks a row action.
      if (url.startsWith("/api/admin/users/")) return json({error:"Synthetic fixture: mutations unavailable"},403);
      return original(input, options);
    };
    setReady(true);
    return () => { window.fetch = original; };
  }, []);
  return <main className="mx-auto min-h-screen max-w-6xl space-y-6 bg-background px-4 py-8 text-foreground">
    <h1 className="text-2xl">Synthetic product journey review</h1>
    <p>Development only. Component interactions use in-memory synthetic responses. No authenticated role layout, database, PDF parser, AI, payment, or hosted widget authorization is exercised.</p>
    <nav aria-label="Synthetic journeys" className="flex flex-wrap gap-3">
      {["import","widget","installed-widget","admin","subscriber"].map(name=><Button key={name} variant="outline" aria-pressed={view === name} onClick={()=>setView(name)}>{name}</Button>)}
      <Button variant="outline" onClick={()=>setTheme(resolvedTheme === "dark" ? "light" : "dark")}>Toggle theme</Button>
    </nav>
    {ready ? view === "import" ? <div className="grid min-w-0 gap-6 lg:grid-cols-2"><PdfImportForm /><ImportHistoryTable /></div> : view === "widget" ? <WidgetPage /> : view === "installed-widget" ? <InstalledWidgetFixture /> : view === "admin" ? <UserTable /> : <PostFeed endpoint="/api/subscriber/bookmarks?sort=newest" emptyTitle="Your reading shelf is empty" /> : <p role="status">Preparing local synthetic responses…</p>}
  </main>;
}

function InstalledWidgetFixture() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/embed/widget.js";
    script.setAttribute("data-api-key", "synthetic-local-configuration");
    document.body.appendChild(script);
    return () => { script.remove(); document.getElementById("tw-widget-btn")?.remove(); document.getElementById("tw-widget-chat")?.remove(); };
  }, []);
  return <p>Actual widget script, synthetic configuration only. Open the AI Twin chat launcher; sending returns a synthetic service failure. No model or visitor-token service is called.</p>;
}
