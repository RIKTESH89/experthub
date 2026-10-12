import { PrismaClient } from "@prisma/client";
import { stagingAuthRuntimeUrl } from "./staging-auth-datasource";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const stagingRuntimeUrl = stagingAuthRuntimeUrl();

export const prisma = stagingRuntimeUrl
  ? new PrismaClient({ datasources: { db: { url: stagingRuntimeUrl } } })
  : globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
