-- Phase G.10 Integration: Database Schema
-- Add tables for StudyFlow and CrossDoc validation tracking

-- 1. StudyFlow Validations Table
CREATE TABLE IF NOT EXISTS studyflow_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_studyflow_validations_project 
  ON studyflow_validations(project_id);
CREATE INDEX IF NOT EXISTS idx_studyflow_validations_document 
  ON studyflow_validations(document_id);
CREATE INDEX IF NOT EXISTS idx_studyflow_validations_created 
  ON studyflow_validations(created_at DESC);

-- 2. CrossDoc Validations Table
CREATE TABLE IF NOT EXISTS crossdoc_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_crossdoc_validations_project 
  ON crossdoc_validations(project_id);
CREATE INDEX IF NOT EXISTS idx_crossdoc_validations_created 
  ON crossdoc_validations(created_at DESC);

-- 3. Add validation fields to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_summary JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ;

-- Create index for validation status
CREATE INDEX IF NOT EXISTS idx_documents_validation_status 
  ON documents(validation_status);

-- 4. Add auto-fix history table
CREATE TABLE IF NOT EXISTS autofix_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID,
  engine_type TEXT NOT NULL, -- 'studyflow' or 'crossdoc'
  issue_ids TEXT[] NOT NULL,
  changes_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  strategy TEXT DEFAULT 'balanced',
  risk_level TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for auto-fix history
CREATE INDEX IF NOT EXISTS idx_autofix_history_project 
  ON autofix_history(project_id);
CREATE INDEX IF NOT EXISTS idx_autofix_history_document 
  ON autofix_history(document_id);
CREATE INDEX IF NOT EXISTS idx_autofix_history_created 
  ON autofix_history(created_at DESC);

-- 5. Add RLS policies
ALTER TABLE studyflow_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crossdoc_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE autofix_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their project validations
CREATE POLICY "Users can view their project studyflow validations"
  ON studyflow_validations FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view their project crossdoc validations"
  ON crossdoc_validations FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view their project autofix history"
  ON autofix_history FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Allow authenticated users to insert validations
CREATE POLICY "Users can insert studyflow validations"
  ON studyflow_validations FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert crossdoc validations"
  ON crossdoc_validations FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert autofix history"
  ON autofix_history FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- 6. Create function to update validation timestamp
CREATE OR REPLACE FUNCTION update_validation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_studyflow_validations_timestamp
  BEFORE UPDATE ON studyflow_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_validation_timestamp();

CREATE TRIGGER update_crossdoc_validations_timestamp
  BEFORE UPDATE ON crossdoc_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_validation_timestamp();

-- 7. Add comments for documentation
COMMENT ON TABLE studyflow_validations IS 'Stores validation results from Study Flow Engine';
COMMENT ON TABLE crossdoc_validations IS 'Stores validation results from Cross-Document Intelligence Engine';
COMMENT ON TABLE autofix_history IS 'Tracks all auto-fix operations applied to documents';
COMMENT ON COLUMN documents.validation_status IS 'Overall validation status: pending, clean, warning, error, critical';
COMMENT ON COLUMN documents.validation_summary IS 'Summary of validation issues (counts by severity)';
COMMENT ON COLUMN documents.last_validated_at IS 'Timestamp of last validation run';
