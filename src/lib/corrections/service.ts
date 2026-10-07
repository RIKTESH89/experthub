import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { z } from "zod";
import { lockOwner, ReviewError, type Store } from "@/lib/persona/store";
import { manifestHash } from "@/lib/persona/manifest";
import { enqueueLifecycleJob } from "@/lib/knowledge/outbox";
import { retireEvidence } from "@/lib/graph/evidence-store";
import { plannedVectorIds } from "@/lib/vector/indexer";
export const proposalSchema=z.object({feedback:z.string().trim().min(1).max(4000),itemId:z.string().min(1).max(200).optional(),sourceVersion:z.number().int().positive().optional(),title:z.string().trim().min(1).max(500).optional(),content:z.string().trim().min(1).max(100000).optional()}).strict();
export type Proposal=z.infer<typeof proposalSchema>;
export type Review={id:string;expertProfileId:string;submittedBy:string;requestHash:string;proposal:Proposal;state:"PENDING"|"ACCEPTED"|"REJECTED";version:number};
function reviewValue(row:Review):Review { return {id:row.id,expertProfileId:row.expertProfileId,submittedBy:row.submittedBy,requestHash:row.requestHash,proposal:row.proposal,state:row.state,version:row.version}; }
async function event(tx:Store,review:Review,actorId:string,key:string,hash:string,action:string,detail:unknown) {
 await tx.$executeRaw`INSERT INTO "CorrectionEvent" ("id","reviewId","expertProfileId","actorId","operationKey","requestHash","action","version","detail") VALUES (${randomUUID()},${review.id},${review.expertProfileId},${actorId},${key},${hash},${action},${review.version},${JSON.stringify(detail)}::jsonb)`;
}
type Submission={expertProfileId:string;actorId:string;submissionKey:string;proposal:Proposal;messageId?:string};
export async function submitCorrection(input:Submission) {
 if(input.submissionKey.startsWith("rating:"))throw new ReviewError(400,"Rating submission keys are reserved");
 return prisma.$transaction(tx=>submitCorrectionInTransaction(tx,input));
}
/** Internal adapter entry point: caller owns the transaction; provenance is server-derived. */
export async function submitCorrectionInTransaction(tx:Store,input:Submission,provenance?:unknown) {
 const proposal=proposalSchema.parse(input.proposal), hash=manifestHash({...input,proposal});
  // Serialize submissions and owner decisions per expert; no belief writes on submission.
  const owners=await tx.$queryRaw<{userId:string}[]>`SELECT "userId" FROM "ExpertProfile" WHERE "id"=${input.expertProfileId} FOR UPDATE`;
  if(!owners.length)throw new ReviewError(404,"Expert not found");
  if(owners[0].userId!==input.actorId){
   if(!input.messageId || proposal.itemId || proposal.sourceVersion || proposal.title || proposal.content)throw new ReviewError(403,"Visitor feedback must reference your own assistant message");
   let message=await tx.chatMessage.findUnique({where:{id:input.messageId},include:{chatSession:true}});
   if(!message || message.role!=="assistant" || message.chatSession.subscriberId!==input.actorId || message.chatSession.expertProfileId!==input.expertProfileId)throw new ReviewError(403,"Message access denied");
   // Session authorization must remain stable until the candidate commits. Match deletion's parent-first order.
   const messageSessionId=message.chatSessionId;
   await tx.$queryRaw`SELECT "id" FROM "ChatSession" WHERE "id"=${messageSessionId} FOR UPDATE`;
   await tx.$queryRaw`SELECT "id" FROM "ChatMessage" WHERE "id"=${input.messageId} FOR UPDATE`;
   message=await tx.chatMessage.findUnique({where:{id:input.messageId},include:{chatSession:true}});
   if(!message || message.chatSessionId!==messageSessionId || message.role!=="assistant" || message.chatSession.subscriberId!==input.actorId || message.chatSession.expertProfileId!==input.expertProfileId)throw new ReviewError(403,"Message access changed");
  }
  const previous=await tx.$queryRaw<Review[]>`SELECT * FROM "CorrectionReview" WHERE "expertProfileId"=${input.expertProfileId} AND "submittedBy"=${input.actorId} AND "submissionKey"=${input.submissionKey}`;
  if(previous.length){if(previous[0].requestHash!==hash)throw new ReviewError(409,"Idempotency key reused");return reviewValue(previous[0]);}
  const review:Review={id:randomUUID(),expertProfileId:input.expertProfileId,submittedBy:input.actorId,requestHash:hash,proposal,state:"PENDING",version:1};
  await tx.$executeRaw`INSERT INTO "CorrectionReview" ("id","expertProfileId","submittedBy","submissionKey","requestHash","messageId","proposal") VALUES (${review.id},${input.expertProfileId},${input.actorId},${input.submissionKey},${hash},${input.messageId||null},${JSON.stringify(proposal)}::jsonb)`;
  await event(tx,review,input.actorId,`submit:${review.id}`,hash,"SUBMIT",{proposal,messageId:input.messageId||null,...(provenance?{provenance}:{})});
  return review;
}
export async function decideCorrection(input:{expertProfileId:string;actorId:string;reviewId:string;expectedVersion:number;operationKey:string;action:"ACCEPT"|"REJECT"|"REVISE";proposal?:Proposal;reason:string}) {
 const hash=manifestHash(input);
 return prisma.$transaction(async tx=>{
  await lockOwner(tx,input.expertProfileId,input.actorId);
  const replay=await tx.$queryRaw<{requestHash:string;detail:{result:Review}}[]>`SELECT "requestHash","detail" FROM "CorrectionEvent" WHERE "expertProfileId"=${input.expertProfileId} AND "operationKey"=${input.operationKey}`;
  if(replay.length){if(replay[0].requestHash!==hash)throw new ReviewError(409,"Idempotency key reused");return replay[0].detail.result;}
  const rows=await tx.$queryRaw<Review[]>`SELECT * FROM "CorrectionReview" WHERE "id"=${input.reviewId} AND "expertProfileId"=${input.expertProfileId} FOR UPDATE`;
  const row=rows[0]; if(!row)throw new ReviewError(404,"Review not found");
  const review=reviewValue(row);
  if(review.state!=="PENDING" || review.version!==input.expectedVersion)throw new ReviewError(409,"Review changed or already decided");
  if(input.action==="REVISE") {if(!input.proposal)throw new ReviewError(400,"Revised proposal required");review.proposal=proposalSchema.parse(input.proposal);}
  else if(input.proposal)throw new ReviewError(400,"Revise before accepting a changed proposal");
  let sourceChange:unknown=null;
  if(input.action==="ACCEPT") {
   const p=review.proposal;
   if(!p.itemId || !p.sourceVersion || !p.title || !p.content)throw new ReviewError(400,"Expert must revise feedback into a complete source correction first");
   await tx.$queryRaw`SELECT "id" FROM "KnowledgeItem" WHERE "id"=${p.itemId} AND "expertProfileId"=${input.expertProfileId} FOR UPDATE`;
   const item=await tx.knowledgeItem.findUnique({where:{id:p.itemId},include:{expertProfile:true}});
   if(!item || item.expertProfileId!==input.expertProfileId || item.sourceType!=="manual" || item.sourceVersion!==p.sourceVersion)throw new ReviewError(409,"Source deleted, changed, or not a manual source");
   if(item.title===p.title && item.content===p.content)throw new ReviewError(400,"Correction does not change source");
   const changed=await tx.knowledgeItem.updateMany({where:{id:item.id,expertProfileId:input.expertProfileId,sourceVersion:p.sourceVersion},data:{title:p.title,content:p.content,sourceVersion:{increment:1},isIndexed:false,indexingError:null}});
   if(changed.count!==1)throw new ReviewError(409,"Source changed");
   await retireEvidence(tx,input.expertProfileId,item.id);
   const version=p.sourceVersion+1;
   await enqueueLifecycleJob({kind:"INDEX",expertProfileId:input.expertProfileId,itemId:item.id,sourceVersion:version,namespace:item.expertProfile.vectorNamespace,vectorIds:plannedVectorIds(input.expertProfileId,item.id,version,`${p.title}\n\n${p.content}`)},tx);
   sourceChange={itemId:item.id,fromVersion:p.sourceVersion,toVersion:version,before:{title:item.title,content:item.content,metadata:item.metadata},beforeHash:manifestHash([item.title,item.content]),afterHash:manifestHash([p.title,p.content])};
  }
  review.version++;review.state=input.action==="ACCEPT"?"ACCEPTED":input.action==="REJECT"?"REJECTED":"PENDING";
  await tx.$executeRaw`UPDATE "CorrectionReview" SET "proposal"=${JSON.stringify(review.proposal)}::jsonb,"state"=${review.state},"version"=${review.version} WHERE "id"=${review.id} AND "expertProfileId"=${input.expertProfileId}`;
  await event(tx,review,input.actorId,input.operationKey,hash,input.action,{reason:input.reason,proposal:review.proposal,sourceChange,result:review});
  return review;
 });
}
