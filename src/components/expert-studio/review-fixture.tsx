"use client";
import { useCallback, useMemo, useState } from "react";
import { ReviewWorkspace } from "@/components/corrections/review-workspace";
import type { PersonaManifest } from "@/lib/persona/manifest";
import type { Review } from "@/lib/corrections/service";

const manifest:PersonaManifest={format:"persona-release-v1",expertProfileId:"synthetic-expert",config:{twinPersonality:null,twinGreeting:"A previous synthetic greeting.",twinOpinions:null,twinFramework:null,twinBoundaries:"Cite evidence and explain uncertainty.",ragEnabled:true,personalityProfile:null},sources:[],identity:{displayName:"Synthetic expert",specialty:["Research methods"]},renderedPersona:{visitor:"Synthetic visitor persona",owner:"Synthetic owner persona"},algorithms:{evidence:"fixture",temporal:"fixture"},parentReleaseId:null,rollbackOf:null};

function createTransport(scenario:string, record:(entry:string)=>void):typeof fetch {
  let writes=0;
  const reviews:Review[]=[{id:"synthetic-review",expertProfileId:"synthetic-expert",submittedBy:"synthetic-reader",requestHash:"synthetic-hash",proposal:{feedback:"Clarify which sources the answer relies on.",itemId:"synthetic-source",sourceVersion:3,title:"Evidence and uncertainty",content:"Cite supplied evidence and explain what remains uncertain."},state:"PENDING",version:2}];
  return async(input,init)=>{
    const url=String(input);
    await new Promise(resolve=>setTimeout(resolve,scenario==="loading"?1800:init?.body?650:100));
    if(scenario==="error")return Response.json({error:"Synthetic service unavailable"},{status:503});
    if(scenario==="owner-denied")return Response.json({error:"Synthetic owner denied"},{status:403});
    if(init?.body){
      const body=JSON.parse(String(init.body));
      if(url.endsWith("/preview"))return Response.json({targetConfig:manifest.config,allowed:scenario!=="blocked-rollback",reason:scenario==="blocked-rollback"?"Synthetic evidence changed. Rollback is unavailable.":null,targetId:"synthetic-release",changedFields:["twinGreeting"],sourceCount:0});
      writes++;record(JSON.stringify({writes,url,expectedVersion:body.expectedVersion,expectedHead:body.expectedHead,operationKey:body.operationKey?"present":"missing"}));
      if(scenario==="conflict")return Response.json({error:"Synthetic source version changed"},{status:409});
      if(url.endsWith("/corrections")){reviews[0]={...reviews[0],version:3,state:body.action==="ACCEPT"?"ACCEPTED":"REJECTED"};return Response.json({review:reviews[0]});}
      return Response.json({releaseId:"synthetic-created-release"});
    }
    if(url.endsWith("/context"))return Response.json({sources:scenario==="empty"?[]:[{id:"synthetic-source",title:"Evidence and uncertainty",content:"Explain uncertainty.",sourceType:scenario==="unsupported-source"?"document":"manual",sourceVersion:scenario==="stale-source"?4:3,indexedVersion:3,isIndexed:scenario!=="indexing",hasIndexingError:false}],truncated:false});
    if(url.endsWith("persona-releases"))return Response.json({releases:scenario==="empty"?[]:[{id:"synthetic-release",manifestHash:"synthetic-manifest",createdAt:"2026-10-04T12:00:00Z",manifest}],heads:scenario==="empty"?[]:[{releaseId:"synthetic-release"}]});
    return Response.json({reviews:scenario==="empty"?[]:reviews,events:[]});
  };
}

export function ReviewFixture() {
  const [scenario,setScenario]=useState("ready");
  const [trace,setTrace]=useState<string[]>([]);
  const record=useCallback((entry:string)=>setTrace(previous=>[...previous,entry]),[]);
  const transport=useMemo(()=>createTransport(scenario,record),[scenario,record]);
  return <div className="space-y-8">
    <aside className="space-y-3 rounded-lg border bg-muted p-4"><p className="text-sm">Synthetic review transport only: these requests stay in memory. This does not test authenticated APIs or server CAS enforcement.</p><label className="flex flex-wrap items-center gap-3">Review scenario<select aria-label="Review scenario" className="rounded border bg-card p-3" value={scenario} onChange={e=>{setScenario(e.target.value);setTrace([]);}}>{["ready","conflict","blocked-rollback","empty","loading","error","owner-denied","indexing","unsupported-source","stale-source"].map(value=><option key={value}>{value}</option>)}</select></label><output aria-label="Synthetic request trace" className="block whitespace-pre-wrap break-all text-sm">{trace.length?trace.join("\n"):"No synthetic writes recorded."}</output></aside>
    <ReviewWorkspace key={scenario} transport={transport}/>
  </div>;
}
