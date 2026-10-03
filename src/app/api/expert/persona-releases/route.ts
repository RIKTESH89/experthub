import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ownerContext, failure } from "@/lib/corrections/http";
import { releasePersona } from "@/lib/persona/store";
const schema=z.object({operationKey:z.string().trim().min(1).max(120),expectedHead:z.string().min(1).max(200).nullable(),rollbackTo:z.string().min(1).max(200).optional()}).strict();
export async function GET() {try {const owner=await ownerContext();
 const releases=await prisma.$queryRaw`SELECT "id","manifestHash","manifest","createdAt" FROM "PersonaRelease" WHERE "expertProfileId"=${owner.expertProfileId} ORDER BY "createdAt" DESC,"id" LIMIT 100`;
 const heads=await prisma.$queryRaw`SELECT * FROM "PersonaReleaseHead" WHERE "expertProfileId"=${owner.expertProfileId}`;
 return NextResponse.json({releases,heads});}catch(e){return failure(e);}}
export async function POST(request:NextRequest) {try{return NextResponse.json(await releasePersona({...await ownerContext(),...schema.parse(await request.json())}),{status:201});}catch(e){return failure(e);}}
