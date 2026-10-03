import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ReviewError } from "@/lib/persona/store";
export async function ownerContext() {
 const session=await auth();
 if(!session?.user?.id)throw new ReviewError(401,"Unauthorized");
 if(session.user.role!=="EXPERT")throw new ReviewError(403,"Expert owner required");
 const expert=await prisma.expertProfile.findUnique({where:{userId:session.user.id}});
 if(!expert)throw new ReviewError(404,"Expert not found");
 return {expertProfileId:expert.id,actorId:session.user.id};
}
export function failure(error:unknown) {
 if(error instanceof ReviewError)return NextResponse.json({error:error.message},{status:error.status});
 if(error instanceof ZodError || error instanceof SyntaxError)return NextResponse.json({error:"Invalid request"},{status:400});
 return NextResponse.json({error:"Unable to complete review operation"},{status:500});
}
