-- Add placeholders column to document_templates table
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS placeholders TEXT[] DEFAULT '{}';

-- Add updated_at column for tracking template updates
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index on placeholders for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_templates_placeholders 
ON document_templates USING GIN (placeholders);

-- Comment
COMMENT ON COLUMN document_templates.placeholders IS 'Array of placeholder variable names extracted from prompt_text (e.g., ["compoundName", "indication"])';
COMMENT ON COLUMN document_templates.updated_at IS 'Timestamp of last template update';
