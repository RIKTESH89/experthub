-- Add opinions, framework, and boundaries fields to ExpertProfile
ALTER TABLE "ExpertProfile" ADD COLUMN IF NOT EXISTS "twinOpinions" TEXT;
ALTER TABLE "ExpertProfile" ADD COLUMN IF NOT EXISTS "twinFramework" TEXT;
ALTER TABLE "ExpertProfile" ADD COLUMN IF NOT EXISTS "twinBoundaries" TEXT;
