import type {KnowledgeItem,Prisma} from "@prisma/client";
import {hashEvidence,overlappingChunks} from "../evidence-extractor";
import {extractTemporal,temporalIdentity,TEMPORAL_EXTRACTOR_VERSION,assertTemporalProjectionVersion,type TemporalProjectionVersion} from "./extractor";
/** Same revision transaction and exact span IDs as EXP12; no mutable timeline counters.
 * Explicit version is for staged projection only; default publication/serving stays v1.
 * chosenAction stores the literal object; polarity belongs to the linked stance. */
export async function publishTemporal(tx:Prisma.TransactionClient,revisionId:string,item:KnowledgeItem,ownerId:string,content:string,authorId:string|null,version:TemporalProjectionVersion=TEMPORAL_EXTRACTOR_VERSION){
 assertTemporalProjectionVersion(version);
 for(const value of extractTemporal(content,authorId,ownerId,version)){
  const spanId=hashEvidence([revisionId,value.start,value.end]);const id=temporalIdentity(revisionId,spanId,value,version);
  const speaker=value.speakerRole==="author"?value.speakerId!:`${item.id}:${value.speakerId||"unknown-speaker"}`;
  const chunks=overlappingChunks(item.expertProfileId,item.id,item.sourceVersion,value.start,value.end,content.length);
  await tx.$executeRaw`INSERT INTO "EvidenceSpan" ("id","revisionId","start","end","text","chunkIds","speakerId","speakerRole") VALUES (${spanId},${revisionId},${value.start},${value.end},${value.text},${chunks},${value.speakerId},${value.speakerRole}) ON CONFLICT ("id") DO NOTHING`;
  await tx.$executeRaw`INSERT INTO "TemporalStance" ("id","revisionId","spanId","expertProfileId","speaker","origin","domain","context","category","polarity","action","validFrom","validUntil","certainty","kind","endorsedByOwner","supersedes","extractorVersion") VALUES
   (${id},${revisionId},${spanId},${item.expertProfileId},${speaker},${value.origin},${value.domain},${value.context},${value.category},${value.polarity},${value.action},${value.validFrom?new Date(value.validFrom):null},${value.validUntil?new Date(value.validUntil):null},${value.certainty},${value.kind},${value.endorsedByOwner},${value.supersedes},${version}) ON CONFLICT ("id") DO NOTHING`;
  if(value.decisionType){
   await tx.$executeRaw`INSERT INTO "EvidenceDecisionCase" ("id","stanceId","spanId","situation","constraints","chosenAction","documentedReasons","alternatives","tradeoffs","exceptions","decisionType","extractorVersion") VALUES
    (${hashEvidence([id,"decision-case"])},${id},${spanId},${value.context},${value.constraints},${value.action},${value.reasons},${value.alternatives},${value.tradeoffs},${value.exceptions},${value.decisionType},${version}) ON CONFLICT ("id") DO NOTHING`;
  }
 }
}
