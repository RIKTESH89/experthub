import { hashEvidence } from "../evidence-extractor";
export const TEMPORAL_EXTRACTOR_VERSION = "literal-temporal-decision-v1";
export type Origin = "expert-authored" | "third-party-description" | "quote" | "unattributed-upload" | "visitor-claim";
export interface TemporalExtraction {
 start:number; end:number; text:string; speakerId:string|null; speakerRole:"author"|"quoted"|"unknown";
 origin:Origin; domain:string|null; context:string|null; category:"preference"|"principle"|"boundary"|"decision";
 polarity:"positive"|"negative"; action:string; reasons:string|null; constraints:string|null; alternatives:string|null;
 tradeoffs:string|null; exceptions:string|null; supersedes:string|null;
 validFrom:string|null; validUntil:string|null; certainty:"source-explicit"|"source-reported"|"unknown";
 kind:"explicit"|"inferred"|"unknown"; endorsedByOwner:boolean; decisionType:"recommendation"|"documented-choice"|null;
}
function date(value:string):string|null {
 const date=new Date(value+"T00:00:00.000Z");return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value ? date.toISOString():null;
}
/** Literal, bounded English grammar only; no topic -> personality inference or inferred biography.
 * Optional source phrases: From/As of DATE [until DATE], In DOMAIN, For CONTEXT,
 * followed by I prefer/recommend/choose/chose, My principle is, or I will not.
 * Because and labeled constraints/alternatives/tradeoffs/exceptions are copied verbatim.
 */
export function extractTemporal(content:string, authorId:string|null, ownerId:string):TemporalExtraction[] {
 const out:TemporalExtraction[]=[];
 for(const m of Array.from(content.matchAll(/[^\r\n]+/g))){
  const text=m[0];if(text.length>2000)continue;
  let statement=text.trim(),speakerId=authorId,speakerRole:TemporalExtraction["speakerRole"]=authorId?"author":"unknown";
  let origin:Origin=authorId===ownerId?"expert-authored":authorId?"third-party-description":"unattributed-upload";
  const quote=statement.match(/^([^:"“”]{1,80})\s+(said|wrote|claimed):\s*["“]([^"“”]+)["”]\s*[.!]?$/i);
  if(quote){statement=quote[3];speakerId=`quoted:${quote[1].trim()}`;speakerRole="quoted";origin=/^visitor$/i.test(quote[1].trim())?"visitor-claim":"quote";}
  else if(/["“”]/.test(statement))continue;
  // Described third-party preferences are not first-person author preferences.
  const described=statement.match(/^([A-Z][\w -]{0,79})\s+(prefers|recommends)\s+(.+)$/);
  if(described){speakerId=`described:${described[1]}`;speakerRole="quoted";origin="third-party-description";statement=`I ${described[2]==="prefers"?"prefer":"recommend"} ${described[3]}`;}
  let validFrom:string|null=null,validUntil:string|null=null,domain:string|null=null,context:string|null=null;
  const time=statement.match(/^(?:From|As of) (\d{4}-\d{2}-\d{2})(?: until (\d{4}-\d{2}-\d{2}))?,\s*/i);
  if(time){validFrom=date(time[1]);validUntil=time[2]?date(time[2]):null;if(!validFrom||(time[2]&&!validUntil)||(validUntil&&validUntil<=validFrom))continue;statement=statement.slice(time[0].length);}
  const domainMatch=statement.match(/^In ([^,;]{1,100}),\s*/i);if(domainMatch){domain=domainMatch[1].trim();statement=statement.slice(domainMatch[0].length);}
  const contextMatch=statement.match(/^For ([^,;]{1,200}),\s*/i);if(contextMatch){context=contextMatch[1].trim();statement=statement.slice(contextMatch[0].length);}
  const core=statement.match(/^(?:I (do not prefer|prefer|recommend|choose|chose)|My (principle is)|I (will not))\s+(.+?)[.!]?$/i);
  if(!core)continue;
  const verb=(core[1]||core[2]||core[3]).toLowerCase();
  const pieces=core[4].split(/;\s*/);let main=pieces.shift()!.trim();
  let reasons:string|null=null,constraints:string|null=null,alternatives:string|null=null,tradeoffs:string|null=null,exceptions:string|null=null,supersedes:string|null=null;
  for(const part of pieces){const tag=part.match(/^(constraints|alternatives|tradeoffs|tradeoff|exceptions|exception|supersedes):\s*(.+)$/i);if(!tag)continue;const value=tag[2].replace(/[.!]$/,"").trim();switch(tag[1].toLowerCase()){
   case "constraints":constraints=value;break;case "alternatives":alternatives=value;break;case "tradeoffs":case "tradeoff":tradeoffs=value;break;case "exceptions":case "exception":exceptions=value;break;case "supersedes":supersedes=value;break;
  }}
  const exception=main.match(/\s+(?:except when|unless)\s+(.+)$/i);if(exception){exceptions=exception[1];main=main.slice(0,exception.index).trim();}
  const because=main.match(/\s+because\s+(.+)$/i);if(because){reasons=because[1];main=main.slice(0,because.index).trim();}
  const replaces=main.match(/\s+instead of\s+(.+)$/i);if(replaces){supersedes=replaces[1];main=main.slice(0,replaces.index).trim();}
  if(!main)continue;
  const endorsedByOwner=origin==="expert-authored"&&speakerRole==="author";
  out.push({start:m.index!,end:m.index!+text.length,text,speakerId,speakerRole,origin,domain,context,
   category:verb==="principle is"?"principle":verb==="will not"?"boundary":["choose","chose"].includes(verb)?"decision":"preference",
   polarity:verb==="do not prefer"||verb==="will not"?"negative":"positive",action:main,reasons,constraints,alternatives,tradeoffs,exceptions,supersedes,
   validFrom,validUntil,certainty:!speakerId?"unknown":endorsedByOwner?"source-explicit":"source-reported",
   kind:speakerId?"explicit":"unknown",endorsedByOwner,decisionType:verb==="chose"?"documented-choice":["prefer","recommend","choose"].includes(verb)?"recommendation":null});
 }
 return out;
}
export function temporalIdentity(revisionId:string,spanId:string,value:TemporalExtraction){return hashEvidence([revisionId,spanId,TEMPORAL_EXTRACTOR_VERSION,value]);}
