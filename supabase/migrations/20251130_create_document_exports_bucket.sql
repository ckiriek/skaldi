-- Create storage bucket for document exports (PDF/DOCX)
-- Files are stored per document: exports/{document_id}/{filename}

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-exports',
  'document-exports',
  false,  -- Private bucket, requires auth
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket

-- Allow authenticated users to read their own project's exports
CREATE POLICY "Users can read own project exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'document-exports'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON d.project_id = p.id
    WHERE d.id::text = (storage.foldername(name))[1]
    AND p.created_by = auth.uid()
  )
);

-- Allow authenticated users to insert exports for their documents
CREATE POLICY "Users can upload own project exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'document-exports'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON d.project_id = p.id
    WHERE d.id::text = (storage.foldername(name))[1]
    AND p.created_by = auth.uid()
  )
);

-- Allow authenticated users to update/delete their exports
CREATE POLICY "Users can update own project exports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'document-exports'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON d.project_id = p.id
    WHERE d.id::text = (storage.foldername(name))[1]
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete own project exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'document-exports'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON d.project_id = p.id
    WHERE d.id::text = (storage.foldername(name))[1]
    AND p.created_by = auth.uid()
  )
);

-- Add columns to documents table to track export status
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS pdf_path TEXT,
ADD COLUMN IF NOT EXISTS docx_path TEXT,
ADD COLUMN IF NOT EXISTS exports_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN documents.pdf_path IS 'Storage path to generated PDF file';
COMMENT ON COLUMN documents.docx_path IS 'Storage path to generated DOCX file';
COMMENT ON COLUMN documents.exports_generated_at IS 'When PDF/DOCX exports were last generated';
