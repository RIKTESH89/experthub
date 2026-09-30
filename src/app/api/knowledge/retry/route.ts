import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { drainLifecycleJobs } from "@/lib/knowledge/lifecycle";

// Owner-scoped bounded recovery. A scheduled runner may call the same service;
// no unauthenticated endpoint or new production scheduler is enabled here.
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({error:"Unauthorized"},{status:401});
    const expert = await prisma.expertProfile.findUnique({where:{userId:session.user.id},select:{id:true}});
    if (!expert) return NextResponse.json({error:"Expert not found"},{status:403});
    return NextResponse.json(await drainLifecycleJobs(expert.id));
  } catch {
    return NextResponse.json({error:"Recovery unavailable"},{status:503});
  }
}
