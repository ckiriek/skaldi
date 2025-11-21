-- Consistency Validations Table
-- Stores validation results for cross-section consistency checks

CREATE TABLE IF NOT EXISTS consistency_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('dosing', 'design', 'sample_size', 'population', 'endpoint')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'warning')),
  message TEXT NOT NULL,
  sections TEXT[] NOT NULL DEFAULT '{}',
  expected_value TEXT,
  actual_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_consistency_validations_document ON consistency_validations(document_id);
CREATE INDEX idx_consistency_validations_status ON consistency_validations(status);
CREATE INDEX idx_consistency_validations_severity ON consistency_validations(severity);
CREATE INDEX idx_consistency_validations_type ON consistency_validations(validation_type);

-- RLS Policies
ALTER TABLE consistency_validations ENABLE ROW LEVEL SECURITY;

-- Users can view validations for documents they created
CREATE POLICY "Users can view their own validation results"
  ON consistency_validations
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE created_by = auth.uid()
    )
  );

-- Users can insert validations for their own documents
CREATE POLICY "Users can create validations for their documents"
  ON consistency_validations
  FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE created_by = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role has full access to validations"
  ON consistency_validations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE TRIGGER update_consistency_validations_updated_at
  BEFORE UPDATE ON consistency_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE consistency_validations IS 'Stores cross-section consistency validation results';
COMMENT ON COLUMN consistency_validations.validation_type IS 'Type of consistency check: dosing, design, sample_size, population, endpoint';
COMMENT ON COLUMN consistency_validations.severity IS 'Severity level: critical, high, medium, low';
COMMENT ON COLUMN consistency_validations.status IS 'Check result: pass, fail, warning';
COMMENT ON COLUMN consistency_validations.sections IS 'Array of section names involved in this check';
COMMENT ON COLUMN consistency_validations.expected_value IS 'Expected value for the parameter';
COMMENT ON COLUMN consistency_validations.actual_value IS 'Actual value found in the document';
COMMENT ON COLUMN consistency_validations.metadata IS 'Additional check-specific metadata';
