-- Phase H.5: RAG Semantic Search Function
-- Creates PostgreSQL function for vector similarity search

-- Function to match knowledge chunks by vector similarity
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  source_id text,
  source_type text,
  chunk_text text,
  chunk_order int,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_rag_index.id,
    knowledge_rag_index.source_id,
    knowledge_rag_index.source_type,
    knowledge_rag_index.chunk_text,
    knowledge_rag_index.chunk_order,
    1 - (knowledge_rag_index.embedding <=> query_embedding) as similarity,
    knowledge_rag_index.metadata
  FROM knowledge_rag_index
  WHERE 1 - (knowledge_rag_index.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_rag_index.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for faster vector search (if not exists)
CREATE INDEX IF NOT EXISTS idx_kg_rag_embedding ON knowledge_rag_index 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_knowledge_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_knowledge_chunks TO anon;
