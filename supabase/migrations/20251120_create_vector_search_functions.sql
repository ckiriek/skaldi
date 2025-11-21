-- Create vector similarity search functions for RAG

-- Function to match drug references by vector similarity
CREATE OR REPLACE FUNCTION match_drug_references(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  compound_name TEXT,
  source TEXT,
  document_type TEXT,
  section_id TEXT,
  content TEXT,
  url TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    drug_reference_chunks.id,
    drug_reference_chunks.compound_name,
    drug_reference_chunks.source,
    drug_reference_chunks.document_type,
    drug_reference_chunks.section_id,
    drug_reference_chunks.content,
    drug_reference_chunks.url,
    drug_reference_chunks.metadata,
    1 - (drug_reference_chunks.embedding <=> query_embedding) AS similarity
  FROM drug_reference_chunks
  WHERE 1 - (drug_reference_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY drug_reference_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to match disease references by vector similarity
CREATE OR REPLACE FUNCTION match_disease_references(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  disease_name TEXT,
  indication TEXT,
  source TEXT,
  document_type TEXT,
  section_id TEXT,
  content TEXT,
  url TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    disease_reference_chunks.id,
    disease_reference_chunks.disease_name,
    disease_reference_chunks.indication,
    disease_reference_chunks.source,
    disease_reference_chunks.document_type,
    disease_reference_chunks.section_id,
    disease_reference_chunks.content,
    disease_reference_chunks.url,
    disease_reference_chunks.metadata,
    1 - (disease_reference_chunks.embedding <=> query_embedding) AS similarity
  FROM disease_reference_chunks
  WHERE 1 - (disease_reference_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY disease_reference_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comments
COMMENT ON FUNCTION match_drug_references IS 'Vector similarity search for drug reference chunks';
COMMENT ON FUNCTION match_disease_references IS 'Vector similarity search for disease reference chunks';
