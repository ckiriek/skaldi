-- Create validation_results table to store validation check results
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  validation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completeness_score INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'review', 'needs_revision')),
  total_rules INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  results JSONB NOT NULL, -- Array of validation check results
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_validation_results_document_id ON validation_results(document_id);
CREATE INDEX idx_validation_results_validation_date ON validation_results(validation_date DESC);

-- Add RLS policies
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

-- Users can view validation results for documents they have access to
CREATE POLICY "Users can view validation results for their documents"
  ON validation_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = validation_results.document_id
      AND p.created_by = auth.uid()
    )
  );

-- Users can insert validation results for their documents
CREATE POLICY "Users can insert validation results for their documents"
  ON validation_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = validation_results.document_id
      AND p.created_by = auth.uid()
    )
  );

-- Add trigger to update updated_at
CREATE TRIGGER update_validation_results_updated_at
  BEFORE UPDATE ON validation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE validation_results IS 'Stores validation check results for documents';
