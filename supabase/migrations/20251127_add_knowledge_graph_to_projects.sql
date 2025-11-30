-- Add knowledge_graph column to projects table
-- This stores the pre-built Knowledge Graph snapshot for use during document generation

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS knowledge_graph JSONB DEFAULT NULL;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS kg_built_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_kg_built_at ON projects(kg_built_at) WHERE kg_built_at IS NOT NULL;

COMMENT ON COLUMN projects.knowledge_graph IS 'Pre-built Knowledge Graph snapshot containing indications, endpoints, formulations, procedures from external sources';
COMMENT ON COLUMN projects.kg_built_at IS 'Timestamp when Knowledge Graph was last built for this project';
