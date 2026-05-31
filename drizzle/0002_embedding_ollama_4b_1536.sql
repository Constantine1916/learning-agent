DROP INDEX IF EXISTS knowledge_chunks_embedding_hnsw_idx;

TRUNCATE TABLE knowledge_chunks;

ALTER TABLE knowledge_chunks
  ALTER COLUMN embedding TYPE vector(1536);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
