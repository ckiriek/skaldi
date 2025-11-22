-- Phase H.1: Formulation Normalizer - Database Schema
-- Add formulation-specific fields to projects table

-- Add new columns for formulation data (all nullable to avoid breaking existing projects)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS api_name TEXT,
ADD COLUMN IF NOT EXISTS dosage_form TEXT,
ADD COLUMN IF NOT EXISTS route TEXT,
ADD COLUMN IF NOT EXISTS strength TEXT,
ADD COLUMN IF NOT EXISTS raw_drug_input TEXT,
ADD COLUMN IF NOT EXISTS formulation_confidence JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS formulation_warnings TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN projects.api_name IS 'Pure INN or chemical name (stripped of salts and brand names)';
COMMENT ON COLUMN projects.dosage_form IS 'Controlled vocabulary dosage form (e.g., tablet, vaginal suppository, injection)';
COMMENT ON COLUMN projects.route IS 'Route of administration (e.g., oral, vaginal, IV, topical)';
COMMENT ON COLUMN projects.strength IS 'Normalized strength (e.g., 500 mg, 1%, 100 IU/ml)';
COMMENT ON COLUMN projects.raw_drug_input IS 'Original raw formulation input from user';
COMMENT ON COLUMN projects.formulation_confidence IS 'Confidence scores for parsed formulation fields';
COMMENT ON COLUMN projects.formulation_warnings IS 'Array of warnings from formulation parsing';

-- Create index for API name lookups
CREATE INDEX IF NOT EXISTS idx_projects_api_name 
  ON projects(api_name) 
  WHERE api_name IS NOT NULL;

-- Create index for dosage form filtering
CREATE INDEX IF NOT EXISTS idx_projects_dosage_form 
  ON projects(dosage_form) 
  WHERE dosage_form IS NOT NULL;

-- Create index for route filtering
CREATE INDEX IF NOT EXISTS idx_projects_route 
  ON projects(route) 
  WHERE route IS NOT NULL;

-- Add check constraint for dosage form (optional, can be removed if too restrictive)
-- ALTER TABLE projects
-- ADD CONSTRAINT check_dosage_form CHECK (
--   dosage_form IS NULL OR
--   dosage_form IN (
--     'tablet', 'film-coated tablet', 'capsule', 'injection',
--     'vaginal suppository', 'vaginal cream', 'vaginal gel',
--     'cream', 'ointment', 'gel', 'spray',
--     'eye drops', 'ophthalmic solution', 'nasal spray',
--     'inhalation powder', 'metered-dose inhaler'
--     -- Add more as needed
--   )
-- );

-- Migration notes:
-- 1. All fields are nullable - existing projects will have NULL values
-- 2. New projects will populate these fields via formulation normalizer
-- 3. Existing projects can be backfilled by re-parsing compound_name
-- 4. No data loss - raw_drug_input preserves original user input
