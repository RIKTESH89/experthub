"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { ExpertStudio } from "./expert-studio";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import { BlogImportForm } from "@/components/knowledge/blog-import-form";
import { PdfImportForm } from "@/components/knowledge/pdf-import-form";
import { TwinConfigForm } from "@/components/knowledge/twin-config-form";
import { ReviewFixture } from "./review-fixture";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
const Knowledge = dynamic(() => import("@/app/(dashboard)/expert/knowledge/page"));
const Posts = dynamic(() => import("@/app/(dashboard)/expert/posts/page"));
const Subscribers = dynamic(() => import("@/app/(dashboard)/expert/subscribers/page"));
const pagePreviews:Record<string,React.ComponentType> = {
  "overview": dynamic(() => import("@/app/(dashboard)/expert/page")),
  "analytics": dynamic(() => import("@/app/(dashboard)/expert/analytics/page")),
  "pricing": dynamic(() => import("@/app/(dashboard)/expert/pricing/page")),
  "profile": dynamic(() => import("@/app/(dashboard)/expert/profile/page")),
  "settings": dynamic(() => import("@/app/(dashboard)/expert/settings/page")),
  "widget": dynamic(() => import("@/app/(dashboard)/expert/widget/page")),
  "posts/new": dynamic(() => import("@/app/(dashboard)/expert/posts/new/page")),
  "posts/detail": dynamic(() => import("@/app/(dashboard)/expert/posts/[postId]/page")),
  "posts/edit": dynamic(() => import("@/app/(dashboard)/expert/posts/[postId]/edit/page")),
  "twin/runtime": dynamic(() => import("@/app/(dashboard)/expert/twin/page")),
};

export function ExpertFixture() {
  const [view, setView] = useState("knowledge/new");
  const { resolvedTheme, setTheme } = useTheme();
  const PagePreview = pagePreviews[view];
  return <main className="min-h-screen bg-background text-foreground px-5 py-8 sm:px-10">
    <div className="mx-auto mb-8 max-w-[1200px] space-y-4 border-b pb-6">
      <p className="text-sm text-muted-foreground">Synthetic expert UI review · development only · no owner session or data. Save and import APIs retain authentication.</p>
      <div className="flex flex-wrap gap-3"><label className="flex items-center gap-3">Review page<select aria-label="Review page" className="rounded border bg-card p-3" value={view} onChange={e=>setView(e.target.value)}>{["knowledge/new","knowledge/import","twin","reviews","knowledge","posts","subscribers",...Object.keys(pagePreviews)].map(value=><option key={value}>{value}</option>)}</select></label><Button variant="outline" onClick={()=>setTheme(resolvedTheme === "dark" ? "light" : "dark")}>Toggle theme</Button></div>
    </div>
    {PagePreview ? <PagePreview /> : view === "knowledge" ? <Knowledge /> : view === "posts" ? <Posts /> : view === "subscribers" ? <Subscribers /> : <ExpertStudio section={view}>
      {view === "knowledge/new" ? <div className="space-y-8"><h1>Add knowledge</h1><KnowledgeForm onCancel={()=>setView("knowledge")} /></div> : view === "knowledge/import" ? <div className="space-y-8"><h1>Import sources</h1><div className="grid gap-8 lg:grid-cols-2"><BlogImportForm /><PdfImportForm /></div></div> : view === "twin" ? <div className="space-y-8"><h1>Configure your twin</h1><TwinConfigForm initialData={{twinGreeting:"Hello. Ask me about the synthetic source library.",twinBoundaries:"Explain uncertainty and cite supplied evidence."}} /></div> : <ReviewFixture />}
    </ExpertStudio>}
  </main>;
}
