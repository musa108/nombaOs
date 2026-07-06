-- Enable the pgvector extension (must be done before creating vector columns)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add the embedding column to BusinessMemory (1536 dims = OpenAI text-embedding-ada-002 / text-embedding-3-small)
ALTER TABLE "BusinessMemory" ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add an HNSW index for fast approximate nearest-neighbour search
CREATE INDEX IF NOT EXISTS "BusinessMemory_embedding_hnsw_idx"
  ON "BusinessMemory" USING hnsw (embedding vector_cosine_ops);
