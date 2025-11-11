-- ============================================================================
-- EVIDENCE LOCKER SCHEMA
-- ============================================================================
-- Purpose: Track and reference all evidence sources used in documents
-- Created: 2025-11-11
-- Compliance: ICH E6(R2) - source data verification and traceability
-- ============================================================================

-- ============================================================================
-- 1. EVIDENCE SOURCES (Enhanced)
-- ============================================================================
-- Stores all evidence sources with detailed metadata and content snippets
CREATE TABLE IF NOT EXISTS evidence_sources_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Evidence identifier
  ev_id TEXT NOT NULL UNIQUE, -- Format: EV-001, EV-002, etc.
  
  -- Project and document context
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_type TEXT, -- 'IB', 'Protocol', 'ICF', 'CSR', 'SAP'
  
  -- Source information
  source_type TEXT NOT NULL,
  -- 'pubchem', 'openfda', 'orange_book', 'dailymed', 'clinicaltrials', 'pubmed', 
  -- 'ema', 'who', 'manual', 'literature', 'internal'
  
  source_url TEXT, -- Full URL to source
  source_id TEXT, -- External ID (e.g., NCT number, PMID, CID)
  source_name TEXT, -- Human-readable source name
  
  -- Content
  title TEXT, -- Title of the source document/article
  snippet TEXT, -- Relevant excerpt from source
  full_content TEXT, -- Full content if available
  
  -- Reference in document
  ref_in_text TEXT[], -- Array of text references (e.g., ["Section 5.2", "Table 3"])
  section_ids TEXT[], -- Array of section IDs where referenced
  
  -- Metadata
  author TEXT, -- Author(s)
  publication_date DATE, -- Publication/retrieval date
  access_date DATE NOT NULL DEFAULT CURRENT_DATE, -- When we accessed it
  version TEXT, -- Version of source document
  
  -- Verification
  verified BOOLEAN DEFAULT false, -- Has been verified by reviewer
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  -- Quality metrics
  relevance_score DECIMAL(3,2), -- 0.00 to 1.00
  confidence_level TEXT, -- 'high', 'medium', 'low'
  data_quality TEXT, -- 'excellent', 'good', 'fair', 'poor'
  
  -- Tags and categorization
  tags TEXT[], -- Array of tags for categorization
  category TEXT, -- 'safety', 'efficacy', 'pharmacology', 'regulatory', etc.
  
  -- Additional metadata
  metadata JSONB, -- Flexible metadata storage
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CHECK (source_type IN (
    'pubchem', 'openfda', 'orange_book', 'dailymed', 'clinicaltrials', 'pubmed',
    'ema', 'who', 'manual', 'literature', 'internal'
  )),
  CHECK (confidence_level IN ('high', 'medium', 'low')),
  CHECK (data_quality IN ('excellent', 'good', 'fair', 'poor')),
  CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1))
);

-- Indexes for evidence_sources_v2
CREATE INDEX idx_evidence_sources_v2_ev_id ON evidence_sources_v2(ev_id);
CREATE INDEX idx_evidence_sources_v2_project_id ON evidence_sources_v2(project_id);
CREATE INDEX idx_evidence_sources_v2_document_id ON evidence_sources_v2(document_id);
CREATE INDEX idx_evidence_sources_v2_source_type ON evidence_sources_v2(source_type);
CREATE INDEX idx_evidence_sources_v2_source_id ON evidence_sources_v2(source_id);
CREATE INDEX idx_evidence_sources_v2_verified ON evidence_sources_v2(verified);
CREATE INDEX idx_evidence_sources_v2_category ON evidence_sources_v2(category);
CREATE INDEX idx_evidence_sources_v2_tags ON evidence_sources_v2 USING GIN(tags);
CREATE INDEX idx_evidence_sources_v2_created_at ON evidence_sources_v2(created_at DESC);
CREATE INDEX idx_evidence_sources_v2_created_by ON evidence_sources_v2(created_by);

-- Full-text search index
CREATE INDEX idx_evidence_sources_v2_search ON evidence_sources_v2 
  USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(snippet, '')));

-- Trigger for updated_at
CREATE TRIGGER update_evidence_sources_v2_updated_at
  BEFORE UPDATE ON evidence_sources_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. EVIDENCE LINKS
-- ============================================================================
-- Links evidence to specific sections/claims in documents
CREATE TABLE IF NOT EXISTS evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Evidence reference
  evidence_id UUID NOT NULL REFERENCES evidence_sources_v2(id) ON DELETE CASCADE,
  
  -- Document reference
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  
  -- Location in document
  section_id TEXT NOT NULL, -- Section identifier
  section_path TEXT, -- JSON path to section
  paragraph_index INTEGER, -- Paragraph number within section
  sentence_index INTEGER, -- Sentence number within paragraph
  
  -- Link details
  link_type TEXT NOT NULL DEFAULT 'citation',
  -- 'citation', 'reference', 'data_source', 'supporting_evidence', 'contradicting_evidence'
  
  claim_text TEXT, -- The specific claim being supported
  context TEXT, -- Surrounding context
  
  -- Metadata
  metadata JSONB,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CHECK (link_type IN ('citation', 'reference', 'data_source', 'supporting_evidence', 'contradicting_evidence'))
);

-- Indexes for evidence_links
CREATE INDEX idx_evidence_links_evidence_id ON evidence_links(evidence_id);
CREATE INDEX idx_evidence_links_document_id ON evidence_links(document_id);
CREATE INDEX idx_evidence_links_version_id ON evidence_links(version_id);
CREATE INDEX idx_evidence_links_section_id ON evidence_links(section_id);
CREATE INDEX idx_evidence_links_link_type ON evidence_links(link_type);
CREATE INDEX idx_evidence_links_created_at ON evidence_links(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_evidence_links_updated_at
  BEFORE UPDATE ON evidence_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE evidence_sources_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_links ENABLE ROW LEVEL SECURITY;

-- evidence_sources_v2 policies
CREATE POLICY "Users can view evidence for their projects"
  ON evidence_sources_v2 FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create evidence for their projects"
  ON evidence_sources_v2 FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update evidence for their projects"
  ON evidence_sources_v2 FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete evidence for their projects"
  ON evidence_sources_v2 FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- evidence_links policies
CREATE POLICY "Users can view evidence links for their documents"
  ON evidence_links FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create evidence links for their documents"
  ON evidence_links FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT d.id FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update evidence links for their documents"
  ON evidence_links FOR UPDATE
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete evidence links for their documents"
  ON evidence_links FOR DELETE
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate next EV-ID
CREATE OR REPLACE FUNCTION generate_ev_id(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_max_num INTEGER;
  v_ev_id TEXT;
BEGIN
  -- Get max number for this project
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(ev_id FROM 'EV-(\d+)') AS INTEGER
      )
    ),
    0
  ) INTO v_max_num
  FROM evidence_sources_v2
  WHERE project_id = p_project_id;
  
  -- Generate new EV-ID
  v_ev_id := 'EV-' || LPAD((v_max_num + 1)::TEXT, 3, '0');
  
  RETURN v_ev_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add evidence source
CREATE OR REPLACE FUNCTION add_evidence_source(
  p_project_id UUID,
  p_source_type TEXT,
  p_source_url TEXT,
  p_title TEXT,
  p_snippet TEXT,
  p_created_by UUID,
  p_source_id TEXT DEFAULT NULL,
  p_document_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS evidence_sources_v2 AS $$
DECLARE
  v_ev_id TEXT;
  v_evidence evidence_sources_v2;
BEGIN
  -- Generate EV-ID
  v_ev_id := generate_ev_id(p_project_id);
  
  -- Insert evidence
  INSERT INTO evidence_sources_v2 (
    ev_id,
    project_id,
    document_id,
    source_type,
    source_url,
    source_id,
    title,
    snippet,
    created_by,
    metadata
  ) VALUES (
    v_ev_id,
    p_project_id,
    p_document_id,
    p_source_type,
    p_source_url,
    p_source_id,
    p_title,
    p_snippet,
    p_created_by,
    p_metadata
  )
  RETURNING * INTO v_evidence;
  
  RETURN v_evidence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify evidence
CREATE OR REPLACE FUNCTION verify_evidence(
  p_evidence_id UUID,
  p_verified_by UUID,
  p_verification_notes TEXT DEFAULT NULL
)
RETURNS evidence_sources_v2 AS $$
DECLARE
  v_evidence evidence_sources_v2;
BEGIN
  UPDATE evidence_sources_v2
  SET 
    verified = true,
    verified_by = p_verified_by,
    verified_at = now(),
    verification_notes = p_verification_notes
  WHERE id = p_evidence_id
  RETURNING * INTO v_evidence;
  
  RETURN v_evidence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search evidence
CREATE OR REPLACE FUNCTION search_evidence(
  p_project_id UUID,
  p_search_query TEXT,
  p_source_type TEXT DEFAULT NULL,
  p_verified_only BOOLEAN DEFAULT false,
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF evidence_sources_v2 AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM evidence_sources_v2
  WHERE project_id = p_project_id
    AND (
      p_search_query IS NULL OR
      to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(snippet, ''))
      @@ plainto_tsquery('english', p_search_query)
    )
    AND (p_source_type IS NULL OR source_type = p_source_type)
    AND (NOT p_verified_only OR verified = true)
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get evidence by EV-ID
CREATE OR REPLACE FUNCTION get_evidence_by_ev_id(p_ev_id TEXT)
RETURNS evidence_sources_v2 AS $$
DECLARE
  v_evidence evidence_sources_v2;
BEGIN
  SELECT * INTO v_evidence
  FROM evidence_sources_v2
  WHERE ev_id = p_ev_id;
  
  RETURN v_evidence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: 2 (evidence_sources_v2, evidence_links)
-- Indexes created: 20+
-- Functions created: 5 (generate_ev_id, add_evidence_source, verify_evidence, search_evidence, get_evidence_by_ev_id)
-- RLS policies: Enabled with user-level access control
-- Full-text search: Enabled on title and snippet
-- ============================================================================
