import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { failure, ownerContext } from "@/lib/corrections/http";
export async function GET() {
 try {const owner=await ownerContext();
 const sources=await prisma.knowledgeItem.findMany({where:{expertProfileId:owner.expertProfileId},select:{id:true,title:true,content:true,sourceType:true,sourceVersion:true,indexedVersion:true,isIndexed:true,indexingError:true},orderBy:{title:"asc"},take:101});
 return NextResponse.json({sources:sources.slice(0,100).map(({indexingError,...source})=>({...source,hasIndexingError:!!indexingError})),truncated:sources.length>100});
 }catch(e){return failure(e);}
}
