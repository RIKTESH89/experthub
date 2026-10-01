import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rebuildEvidenceSource } from "@/lib/graph/evidence-store";

/** Owner-only, one-source backfill. No model/external service calls. */
export async function POST(_request: Request, {params}: {params: Promise<{itemId: string}>}) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({error:"Unauthorized"},{status:401});
  const expert = await prisma.expertProfile.findUnique({where:{userId:session.user.id}});
  if (!expert) return NextResponse.json({error:"Expert profile not found"},{status:404});
  const {itemId} = await params;
  const revisionId = await rebuildEvidenceSource(expert.id,itemId);
  if (!revisionId) return NextResponse.json({error:"No current indexed supported source"},{status:404});
  return NextResponse.json({revisionId,extractor:"literal-preference-v1"});
}
