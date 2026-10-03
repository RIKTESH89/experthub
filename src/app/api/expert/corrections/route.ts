import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ownerContext, failure } from "@/lib/corrections/http";
import { submitCorrection, decideCorrection, proposalSchema } from "@/lib/corrections/service";
const key=z.string().trim().min(1).max(120).refine(s=>!s.startsWith("submit:"));
const submission=z.object({submissionKey:key,proposal:proposalSchema}).strict();
const decision=z.object({reviewId:z.string().min(1).max(200),expectedVersion:z.number().int().positive(),operationKey:key,action:z.enum(["ACCEPT","REJECT","REVISE"]),proposal:proposalSchema.optional(),reason:z.string().trim().min(1).max(4000)}).strict();
export async function GET() {
 try { const owner=await ownerContext();
 const reviews=await prisma.$queryRaw`SELECT * FROM "CorrectionReview" WHERE "expertProfileId"=${owner.expertProfileId} ORDER BY "createdAt" DESC,"id" LIMIT 100`;
 const events=await prisma.$queryRaw`SELECT e.* FROM "CorrectionEvent" e JOIN (SELECT "id" FROM "CorrectionReview" WHERE "expertProfileId"=${owner.expertProfileId} ORDER BY "createdAt" DESC,"id" LIMIT 100) r ON r."id"=e."reviewId" WHERE e."expertProfileId"=${owner.expertProfileId} ORDER BY e."createdAt",e."version" LIMIT 1000`;
 return NextResponse.json({reviews,events}); }catch(e){return failure(e);}
}
export async function POST(request:NextRequest) {try{return NextResponse.json(await submitCorrection({...await ownerContext(),...submission.parse(await request.json())}),{status:201});}catch(e){return failure(e);}}
export async function PATCH(request:NextRequest) {try{return NextResponse.json(await decideCorrection({...await ownerContext(),...decision.parse(await request.json())}));}catch(e){return failure(e);}}
