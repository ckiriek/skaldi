-- Add content column to documents table
-- This is a temporary solution until we fully migrate to document_versions
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;
