import type { Prisma } from '@prisma/client';
import { BillingRuntimeError } from './billing-runtime';
export async function requireBillingAdmin(tx:Prisma.TransactionClient,actorId:string) {
 const rows=await tx.$queryRaw<{id:string}[]>`SELECT "id" FROM "User" WHERE "id"=${actorId} AND "role"='ADMIN' AND "isActive"=true AND "isBanned"=false FOR SHARE`;
 if(rows.length!==1)throw new BillingRuntimeError('Active administrator required',403);
}
