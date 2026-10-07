"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { PublicExpertProfileView } from "@/components/public-studio/expert-profile-view";
import { SharedConversationView } from "@/components/shared/shared-conversation-view";
import ErrorView from "@/app/error";
import NotFoundView from "@/app/not-found";
import admin from "@/app/(dashboard)/admin/admin-studio.module.css";
import { Button } from "@/components/ui/button";
import { AdminReviewFixture } from "@/components/admin/admin-review-fixture";
import { Input } from "@/components/ui/input";
const expert = { id:"synthetic-profile",name:"Sam Example",displayName:"Sam Example",image:null,bio:"Synthetic profile for layout review. This expert studies how teams document decisions and make knowledge easier to find.\n\nA longer biography tests the reading measure, spacing, and mobile layout.",headline:"Knowledge systems & team learning",specialty:["Knowledge systems","Team learning"],socialLinks:null,monthlyPrice:0,isVerified:false,subscriberCount:0,postCount:0,twinGreeting:null };
export function PublicAdminFixture() {
 const [view,setView]=useState("Profile"); const [resets,setResets]=useState(0);const [query,setQuery]=useState("");
 const {resolvedTheme,setTheme}=useTheme();
 return <>
  <aside className="border-b border-border bg-card p-4 space-y-3">
   <p className="text-sm font-medium">LOCAL SYNTHETIC PRESENTATION FIXTURE · No account, AI, payments or admin access</p>
   <div className="flex flex-wrap gap-2">{["Profile","Transcript","Admin","Analytics","Applications","Error","Missing"].map(v=><Button key={v} variant={v===view?"default":"outline"} onClick={()=>setView(v)}>{v}</Button>)}<Button variant="outline" onClick={()=>setTheme(resolvedTheme==="dark"?"light":"dark")}>Toggle theme</Button></div>
  </aside>
  {(view==="Analytics"||view==="Applications")&&<AdminReviewFixture key={view} view={view}/>}
  {view==="Profile"&&<PublicExpertProfileView expert={expert}/>}
  {view==="Transcript"&&<SharedConversationView expert={{...expert,user:{name:expert.name,image:null}}} messages={[{id:"q",role:"user",content:"How can a team make its decisions easier to revisit?",createdAt:"2026-10-04T00:00:00Z"},{id:"a",role:"assistant",content:"Synthetic response for presentation review only. Record the decision, the context, and the alternatives considered. Keep ownership and a review date visible.\n\nThis fixture does not represent a real AI response or source citation.",createdAt:"2026-10-04T00:00:00Z"}]}/>}
  {view==="Error"&&<><p className="p-4 text-sm">Fixture reset count: {resets}</p><ErrorView error={{name:"Error",message:"Synthetic",digest:"fixture-only"}} reset={()=>setResets(n=>n+1)}/></>}
  {view==="Missing"&&<NotFoundView/>}
  {view==="Admin"&&<main className={`${admin.workspace} max-w-6xl mx-auto p-6 space-y-8`}>
   <header className={admin.overview}><div><p className={admin.eyebrow}>Administration / Presentation fixture</p><h1>Platform operations</h1><p className="text-muted-foreground">Synthetic visual sample. Actual admin routes remain protected.</p></div><aside><p>No operational data is loaded.</p></aside></header>
   <section className="space-y-4"><h2>User directory</h2><label htmlFor="fixture-search" className="block text-sm">Search synthetic sample</label><Input id="fixture-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name"/><div className="overflow-x-auto border border-border rounded-lg"><table className="w-full text-left"><thead><tr className="border-b border-border"><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>{!query||"sam example".includes(query.toLowerCase())?<tr><td>Sam Example (synthetic)</td><td>Expert</td><td>Fixture only</td></tr>:<tr><td colSpan={3} className="text-muted-foreground">No matching synthetic users.</td></tr>}</tbody></table></div></section>
  </main>}
 </>;
}
