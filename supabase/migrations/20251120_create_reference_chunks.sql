-- Migration: Create reference chunks tables for RAG
-- Date: 2025-11-20
-- Purpose: Store chunked reference documents with embeddings for semantic search

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Drug/Compound reference chunks
CREATE TABLE IF NOT EXISTS drug_reference_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_name TEXT NOT NULL,
  source TEXT NOT NULL, -- 'fda_label', 'pubmed', 'ctgov', 'epar', 'local_docs', 'clinical_reference'
  document_type TEXT, -- 'ib', 'protocol', 'csr', 'spc', 'icf'
  section_id TEXT, -- Which section this chunk is relevant for
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- Azure OpenAI text-embedding-ada-002 dimension
  metadata JSONB, -- Additional metadata (page, paragraph, etc)
  url TEXT, -- Source URL if available
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Disease reference chunks
CREATE TABLE IF NOT EXISTS disease_reference_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disease_name TEXT NOT NULL,
  indication TEXT, -- More specific indication
  source TEXT NOT NULL,
  document_type TEXT,
  section_id TEXT,
  content TEXT NOT NULL,
  embedding VECTOR(3072),
  metadata JSONB,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clinical reference documents (from clinical_reference/ folder)
CREATE TABLE IF NOT EXISTS clinical_reference_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL, -- 'protocol', 'ib', 'csr', 'icf', 'synopsis', 'spc'
  compound_name TEXT,
  disease TEXT,
  full_content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast vector search (using ivfflat for Supabase compatibility)
CREATE INDEX IF NOT EXISTS idx_drug_chunks_embedding 
ON drug_reference_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_disease_chunks_embedding 
ON disease_reference_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_drug_chunks_compound 
ON drug_reference_chunks(compound_name);

CREATE INDEX IF NOT EXISTS idx_drug_chunks_source 
ON drug_reference_chunks(source);

CREATE INDEX IF NOT EXISTS idx_drug_chunks_section 
ON drug_reference_chunks(section_id);

CREATE INDEX IF NOT EXISTS idx_disease_chunks_disease 
ON disease_reference_chunks(disease_name);

CREATE INDEX IF NOT EXISTS idx_disease_chunks_section 
ON disease_reference_chunks(section_id);

CREATE INDEX IF NOT EXISTS idx_clinical_ref_type 
ON clinical_reference_documents(document_type);

-- Comments
COMMENT ON TABLE drug_reference_chunks IS 'Chunked drug/compound reference material with embeddings for RAG';
COMMENT ON TABLE disease_reference_chunks IS 'Chunked disease reference material with embeddings for RAG';
COMMENT ON TABLE clinical_reference_documents IS 'Full clinical reference documents from clinical_reference/ folder';

COMMENT ON COLUMN drug_reference_chunks.embedding IS 'Azure OpenAI text-embedding-ada-002 (1536 dimensions)';
COMMENT ON COLUMN disease_reference_chunks.embedding IS 'Azure OpenAI text-embedding-ada-002 (1536 dimensions)';
