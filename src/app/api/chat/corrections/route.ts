import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { failure } from "@/lib/corrections/http";
import { submitCorrection } from "@/lib/corrections/service";
const schema=z.object({expertProfileId:z.string().min(1).max(200),messageId:z.string().min(1).max(200),submissionKey:z.string().min(1).max(120),feedback:z.string().trim().min(1).max(4000)}).strict();
export async function POST(request:NextRequest) {
 try {const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {feedback,...input}=schema.parse(await request.json());
 return NextResponse.json(await submitCorrection({...input,actorId:session.user.id,proposal:{feedback}}),{status:201});
 }catch(e){return failure(e);}
}
