import prisma from "@/lib/prisma";
import type {RetrievalScope} from "@/lib/knowledge/access";
import type {RetrievalResult} from "@/lib/vector/retriever";
import {authorizedEvidenceSpans,type AuthorizedSpan} from "../evidence-store";
import {resolveTimeline,type TimelineStance,type TemporalQuery} from "./timeline";
import {TEMPORAL_EXTRACTOR_VERSION} from "./extractor";
export interface DecisionFields {situation:string|null;constraints:string|null;chosenAction:string|null;documentedReasons:string|null;alternatives:string|null;tradeoffs:string|null;exceptions:string|null;decisionType:string|null;}
export type TemporalStanceTrace=TimelineStance&AuthorizedSpan&DecisionFields&{certainty:string;kind:string;extractorVersion:string};
export async function retrieveTemporalEvidence(scope:RetrievalScope,results:RetrievalResult[],query:TemporalQuery={mode:"current"}){
 const spans=await authorizedEvidenceSpans(scope,results);if(!spans.length)return resolveTimeline<TemporalStanceTrace>([],query);
 const rows=await prisma.$queryRaw<(Omit<TemporalStanceTrace,keyof AuthorizedSpan|"recordedAt">&{spanId:string})[]>`SELECT s."id",s."spanId",s."speaker",s."origin",s."domain",s."context",s."category",s."polarity",s."action",s."validFrom",s."validUntil",s."certainty",s."kind",s."endorsedByOwner",s."supersedes",s."extractorVersion",
 d."situation",d."constraints",d."chosenAction",d."documentedReasons",d."alternatives",d."tradeoffs",d."exceptions",d."decisionType"
 FROM "TemporalStance" s JOIN "EvidenceSpan" p ON p."id"=s."spanId" AND p."revisionId"=s."revisionId" JOIN "EvidenceRevision" r ON r."id"=s."revisionId" AND r."expertProfileId"=s."expertProfileId" LEFT JOIN "EvidenceDecisionCase" d ON d."stanceId"=s."id" AND d."spanId"=s."spanId" WHERE s."expertProfileId"=${scope.expertProfileId} AND s."spanId"=ANY(${spans.map(s=>s.spanId)}::text[]) AND s."extractorVersion"=${TEMPORAL_EXTRACTOR_VERSION} ORDER BY s."id"`;
 const bySpan=new Map(spans.map(s=>[s.spanId,s]));
 const traces=rows.flatMap(row=>{const span=bySpan.get(row.spanId);return span?[{...span,...row,recordedAt:span.ingestedAt}]:[];});
 return resolveTimeline<TemporalStanceTrace>(traces,query);
}
export type TemporalRetrievalResult=Awaited<ReturnType<typeof retrieveTemporalEvidence>>;
export function temporalPrompt(result:TemporalRetrievalResult):string[]{
 if(!result.stances.length&&!result.relations.length)return [];
 return [`Temporal evidence (${result.mode}, valid at ${result.validAt}; ${result.coverage}). Recorded time is not validity. Reasons absent from a case are UNKNOWN; never invent experiences, motives or beliefs. Apply documented constraints/exceptions only in their stated context. Quoted/described/visitor/upload claims do not establish expert stances. Do not resolve disagreement by newest recorded time.`,
 ...result.stances.map(s=>`[stance ${s.id}; revision ${s.revisionId}; span ${s.start}:${s.end}; ${s.origin}; ${s.kind}; ${s.certainty}; validity ${s.validFrom?.toISOString()||"unknown"} to ${s.validUntil?.toISOString()||"unknown"}; owner endorsement ${s.endorsedByOwner}] domain=${s.domain||"UNKNOWN"}; context=${s.context||"UNKNOWN"}; ${s.category} ${s.polarity}: ${s.action}; reasons=${s.documentedReasons||"UNKNOWN"}; constraints=${s.constraints||"UNKNOWN"}; alternatives=${s.alternatives||"UNKNOWN"}; tradeoffs=${s.tradeoffs||"UNKNOWN"}; exceptions=${s.exceptions||"UNKNOWN"}`),
 ...result.relations.map(r=>`[${r.type}; ${r.kind}; spans ${r.evidenceSpanIds.join(",")}] ${r.from} -> ${r.to}; ${r.uncertainty||"source-declared dated replacement"}`)];
}
