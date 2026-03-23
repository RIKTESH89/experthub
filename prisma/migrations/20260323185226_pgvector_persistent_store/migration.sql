-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "VectorChunk" (
    "id" TEXT NOT NULL,
    "vectorId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VectorChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VectorChunk_vectorId_key" ON "VectorChunk"("vectorId");

-- CreateIndex
CREATE INDEX "VectorChunk_namespace_idx" ON "VectorChunk"("namespace");

-- CreateIndex (HNSW for fast cosine similarity search)
CREATE INDEX "VectorChunk_embedding_idx" ON "VectorChunk" USING hnsw ("embedding" vector_cosine_ops);
