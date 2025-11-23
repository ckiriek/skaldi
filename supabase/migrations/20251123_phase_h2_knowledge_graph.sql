-- Phase H.2-H.6: Clinical Knowledge Graph & Data Ingestion Layer
-- Database Schema for Knowledge Graph

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Knowledge Formulations
CREATE TABLE IF NOT EXISTS knowledge_formulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inn TEXT NOT NULL,
  routes TEXT[],
  dosage_forms TEXT[],
  strengths TEXT[],
  sources TEXT[],
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_formulations_inn ON knowledge_formulations(inn);
CREATE INDEX IF NOT EXISTS idx_kg_formulations_confidence ON knowledge_formulations(confidence DESC);

COMMENT ON TABLE knowledge_formulations IS 'Aggregated formulation data from multiple sources';
COMMENT ON COLUMN knowledge_formulations.confidence IS 'Confidence score 0-1 based on source agreement';

-- 2. Knowledge Indications
CREATE TABLE IF NOT EXISTS knowledge_indications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inn TEXT,
  indication TEXT NOT NULL,
  icd10_code TEXT,
  sources TEXT[],
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_indications_inn ON knowledge_indications(inn);
CREATE INDEX IF NOT EXISTS idx_kg_indications_icd10 ON knowledge_indications(icd10_code);
CREATE INDEX IF NOT EXISTS idx_kg_indications_confidence ON knowledge_indications(confidence DESC);

COMMENT ON TABLE knowledge_indications IS 'Clinical indications from FDA, EMA, ClinicalTrials.gov';

-- 3. Knowledge Endpoints
CREATE TABLE IF NOT EXISTS knowledge_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inn TEXT,
  indication TEXT,
  title TEXT NOT NULL,
  cleaned_title TEXT,
  endpoint_type TEXT CHECK (endpoint_type IN ('continuous', 'binary', 'time_to_event', 'ordinal', 'count')),
  timepoint TEXT,
  variable_name TEXT,
  sources TEXT[],
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_endpoints_inn ON knowledge_endpoints(inn);
CREATE INDEX IF NOT EXISTS idx_kg_endpoints_indication ON knowledge_endpoints(indication);
CREATE INDEX IF NOT EXISTS idx_kg_endpoints_type ON knowledge_endpoints(endpoint_type);

COMMENT ON TABLE knowledge_endpoints IS 'Primary/secondary endpoints from clinical trials';

-- 4. Knowledge Procedures
CREATE TABLE IF NOT EXISTS knowledge_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  loinc_code TEXT,
  synonyms TEXT[],
  sources TEXT[],
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_procedures_name ON knowledge_procedures(name);
CREATE INDEX IF NOT EXISTS idx_kg_procedures_loinc ON knowledge_procedures(loinc_code);
CREATE INDEX IF NOT EXISTS idx_kg_procedures_category ON knowledge_procedures(category);

COMMENT ON TABLE knowledge_procedures IS 'Clinical procedures and assessments';

-- 5. Knowledge Eligibility
CREATE TABLE IF NOT EXISTS knowledge_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inn TEXT,
  indication TEXT,
  inclusion_text TEXT,
  exclusion_text TEXT,
  sources TEXT[],
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_eligibility_inn ON knowledge_eligibility(inn);
CREATE INDEX IF NOT EXISTS idx_kg_eligibility_indication ON knowledge_eligibility(indication);

COMMENT ON TABLE knowledge_eligibility IS 'Inclusion/exclusion criteria patterns';

-- 6. Knowledge RAG Index (Vector embeddings)
CREATE TABLE IF NOT EXISTS knowledge_rag_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('fda_label', 'dailymed', 'ctgov', 'ema', 'reference_protocol')),
  chunk_text TEXT NOT NULL,
  chunk_order INTEGER,
  embedding vector(1536), -- OpenAI ada-002 dimension
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_rag_source ON knowledge_rag_index(source_id);
CREATE INDEX IF NOT EXISTS idx_kg_rag_type ON knowledge_rag_index(source_type);
-- Vector similarity search index (using ivfflat for performance)
CREATE INDEX IF NOT EXISTS idx_kg_rag_embedding ON knowledge_rag_index 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE knowledge_rag_index IS 'Vector embeddings for semantic search';

-- 7. Knowledge Snapshots (Cached aggregated data)
CREATE TABLE IF NOT EXISTS knowledge_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inn TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  sources_used TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_snapshots_inn ON knowledge_snapshots(inn);
CREATE INDEX IF NOT EXISTS idx_kg_snapshots_created ON knowledge_snapshots(created_at DESC);

COMMENT ON TABLE knowledge_snapshots IS 'Cached Knowledge Graph snapshots for fast retrieval';

-- 8. Ingestion Log (Track API calls and errors)
CREATE TABLE IF NOT EXISTS knowledge_ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  inn TEXT,
  status TEXT CHECK (status IN ('success', 'error', 'timeout', 'partial')),
  records_fetched INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_ingestion_inn ON knowledge_ingestion_log(inn);
CREATE INDEX IF NOT EXISTS idx_kg_ingestion_source ON knowledge_ingestion_log(source_type);
CREATE INDEX IF NOT EXISTS idx_kg_ingestion_status ON knowledge_ingestion_log(status);
CREATE INDEX IF NOT EXISTS idx_kg_ingestion_created ON knowledge_ingestion_log(created_at DESC);

COMMENT ON TABLE knowledge_ingestion_log IS 'Monitoring and debugging for data ingestion';

-- Migration notes:
-- 1. All tables use UUID primary keys for consistency
-- 2. Confidence scores are 0-1 decimals with CHECK constraints
-- 3. Sources are TEXT arrays to track data provenance
-- 4. raw_data JSONB preserves original API responses
-- 5. Vector extension required for semantic search
-- 6. Indexes optimized for common query patterns
