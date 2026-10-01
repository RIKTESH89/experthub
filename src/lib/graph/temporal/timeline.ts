export const TIMELINE_VERSION="literal-validity-v1";
export interface TimelineStance {
 id:string;spanId:string;revisionId:string;speaker:string;origin:string;domain:string|null;context:string|null;
 category:string;polarity:string;action:string;validFrom:Date|null;validUntil:Date|null;recordedAt:Date;
 supersedes:string|null;endorsedByOwner:boolean;constraints?:string|null;
}
export type TemporalQuery=({mode:"current";now?:Date}|{mode:"as-of";validAt:Date;knownAt?:Date})&{domain?:string;context?:string};
export interface StanceRelation {from:string;to:string;type:"supersedes"|"contradiction"|"unresolved-disagreement";kind:"explicit"|"inferred";evidenceSpanIds:string[];uncertainty:string|null;}
const normalize=(text:string)=>text.trim().toLowerCase();
function group(s:TimelineStance){return JSON.stringify([s.speaker,s.origin,s.domain,s.context,s.constraints||null,s.category]);}
/** No newest-wins heuristic. Supersession requires a source-declared replacement
 * and effective valid date. Differing contextual preferences are not contradictions.
 */
export function resolveTimeline<T extends TimelineStance>(rows:T[],query:TemporalQuery){
 const at=query.mode==="current"?(query.now||new Date()):query.validAt;
 if(Number.isNaN(at.getTime())||(query.mode==="as-of"&&query.knownAt&&Number.isNaN(query.knownAt.getTime())))throw Error("Invalid temporal query date");
 const active=[...rows].sort((a,b)=>a.id.localeCompare(b.id)).filter(s=>(!query.domain||s.domain===query.domain)&&(!query.context||s.context===query.context)&&
  (!s.validFrom||s.validFrom<=at)&&(!s.validUntil||s.validUntil>at)&&
  (query.mode!=="as-of"||!query.knownAt||s.recordedAt<=query.knownAt));
 const relations:StanceRelation[]=[],superseded=new Set<string>();
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
  const a=active[i],b=active[j];if(group(a)!==group(b))continue;
  const replacement=[[a,b],[b,a]].find(([next,old])=>next.supersedes&&normalize(next.supersedes)===normalize(old.action)&&next.validFrom&&(!old.validFrom||next.validFrom>old.validFrom));
  if(replacement){const [next,old]=replacement;if(next.validFrom&&(!old.validFrom||next.validFrom>old.validFrom)){
    relations.push({from:next.id,to:old.id,type:"supersedes",kind:"explicit",evidenceSpanIds:[next.spanId,old.spanId],uncertainty:null});superseded.add(old.id);continue;
  }}
  if(normalize(a.action)===normalize(b.action)&&a.polarity===b.polarity)continue;
  const contradiction=normalize(a.action)===normalize(b.action)&&a.polarity!==b.polarity;
  // Multiple distinct documented principles/boundaries can coexist.
  if(!contradiction&&(a.category==="principle"||a.category==="boundary"))continue;
  relations.push({from:a.id,to:b.id,type:contradiction?"contradiction":"unresolved-disagreement",kind:"inferred",evidenceSpanIds:[a.spanId,b.spanId],uncertainty:!a.validFrom||!b.validFrom?"valid-time-unknown; do not resolve by recorded recency":contradiction?"literal positive/negative conflict in the same documented context":"different choices need review; not necessarily mutually exclusive"});
 }
 return {resolverVersion:TIMELINE_VERSION,mode:query.mode,validAt:at.toISOString(),knownAt:query.mode==="as-of"?query.knownAt?.toISOString()||null:null,
  supersededStances:active.filter(s=>superseded.has(s.id)),
  stances:active.filter(s=>!superseded.has(s.id)).map(s=>({...s,temporalUncertainty:s.validFrom?null:"valid-time-unknown"})),relations,
  coverage:"selected currently authorized sources only; not an exhaustive belief inventory"};
}

/** Explicit date selector in the existing question text; not a general intent planner.
 * Other dates mentioned in a question never silently change its temporal mode.
 */
export function temporalQueryFromQuestion(question:string):TemporalQuery|undefined {
 const match=question.match(/^\s*As of (\d{4}-\d{2}-\d{2})(?:\b)/i);if(!match)return undefined;
 const validAt=new Date(match[1]+"T00:00:00.000Z");if(Number.isNaN(validAt.getTime())||validAt.toISOString().slice(0,10)!==match[1])throw Error("Invalid explicit as-of date");
 return {mode:"as-of",validAt};
}
