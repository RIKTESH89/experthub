-- CreateEnum
CREATE TYPE "ExpertApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ExpertApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ExpertApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpertApplication_status_idx" ON "ExpertApplication"("status");
CREATE INDEX "ExpertApplication_email_idx" ON "ExpertApplication"("email");
