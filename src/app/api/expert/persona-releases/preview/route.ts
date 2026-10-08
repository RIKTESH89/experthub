import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ownerContext, failure } from "@/lib/corrections/http";
import { previewPersonaActivation } from "@/lib/persona/store";
const schema=z.object({expectedHead:z.string().min(1).max(200).nullable(),rollbackTo:z.string().min(1).max(200).optional()}).strict();
export async function POST(request:NextRequest) {try{return NextResponse.json(await previewPersonaActivation({...await ownerContext(),...schema.parse(await request.json())}));}catch(e){return failure(e);}}
