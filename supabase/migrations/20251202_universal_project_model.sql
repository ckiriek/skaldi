-- ============================================================================
-- Universal Project Model Migration
-- 
-- Adds compound_type, therapeutic_class, and related fields to support
-- compound-agnostic document generation for Phase 2/3/4 clinical trials.
-- 
-- Version: 1.0.0
-- Date: 2025-12-02
-- ============================================================================

-- ============================================================================
-- 1. ADD COMPOUND TYPE ENUM
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compound_type') THEN
        CREATE TYPE compound_type AS ENUM (
            'small_molecule',
            'biologic',
            'biosimilar',
            'atmp'
        );
    END IF;
END $$;

-- ============================================================================
-- 2. ADD THERAPEUTIC CLASS ENUM
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapeutic_class') THEN
        CREATE TYPE therapeutic_class AS ENUM (
            -- Small molecule classes
            'SSRI',
            'SNRI',
            'TCA',
            'PPI',
            'STATIN',
            'NSAID',
            'ACE_INHIBITOR',
            'ARB',
            'BETA_BLOCKER',
            'ANTIBIOTIC',
            'ANTIVIRAL',
            'ANTIFUNGAL',
            'ANTICOAGULANT',
            'ANTIDIABETIC',
            'OPIOID',
            -- Biologic classes
            'mAb',
            'ANTI_TNF',
            'PD1_INHIBITOR',
            'IL_INHIBITOR',
            'CD20_INHIBITOR',
            'HER2_INHIBITOR',
            'VEGF_INHIBITOR',
            'INSULIN',
            'GLP1_AGONIST',
            'EPO',
            'GCSF',
            -- ATMP classes
            'CAR_T',
            'GENE_THERAPY',
            -- Default
            'OTHER'
        );
    END IF;
END $$;

-- ============================================================================
-- 3. ADD NEW COLUMNS TO PROJECTS TABLE
-- ============================================================================

-- Add compound_type column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS compound_type compound_type DEFAULT 'small_molecule';

-- Add therapeutic_class column (if drug_class doesn't exist or is different)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS therapeutic_class therapeutic_class DEFAULT 'OTHER';

-- Add study_phase as integer (for strict Phase 2/3/4 validation)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS study_phase integer;

-- Add population fields
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS population_type text DEFAULT 'adults';

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS population_age_min integer DEFAULT 18;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS population_age_max integer DEFAULT 65;

-- Add route of administration
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS route_of_administration text DEFAULT 'oral';

-- Add treatment duration
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS treatment_duration_weeks integer;

-- Add enrichment metadata
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS enrichment_completed_at timestamptz;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS ib_enrichment_data jsonb;

-- ============================================================================
-- 4. CREATE INDEX FOR COMPOUND TYPE QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_compound_type ON projects(compound_type);
CREATE INDEX IF NOT EXISTS idx_projects_therapeutic_class ON projects(therapeutic_class);
CREATE INDEX IF NOT EXISTS idx_projects_study_phase ON projects(study_phase);

-- ============================================================================
-- 5. ADD CHECK CONSTRAINT FOR PHASE 2/3/4 ONLY
-- ============================================================================

-- Note: This is a soft constraint - we allow NULL for backward compatibility
-- but new projects should only have Phase 2, 3, or 4
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS check_study_phase_2_3_4;

ALTER TABLE projects 
ADD CONSTRAINT check_study_phase_2_3_4 
CHECK (study_phase IS NULL OR study_phase IN (2, 3, 4));

-- ============================================================================
-- 6. MIGRATE EXISTING DATA
-- ============================================================================

-- Update study_phase from phase column where possible
UPDATE projects 
SET study_phase = 
    CASE 
        WHEN phase ILIKE '%1%' AND phase NOT ILIKE '%2%' THEN NULL  -- Phase 1 not supported
        WHEN phase ILIKE '%2%' THEN 2
        WHEN phase ILIKE '%3%' THEN 3
        WHEN phase ILIKE '%4%' THEN 4
        ELSE 2  -- Default to Phase 2
    END
WHERE study_phase IS NULL AND phase IS NOT NULL;

-- Update therapeutic_class from drug_class where possible
UPDATE projects 
SET therapeutic_class = 
    CASE 
        WHEN drug_class ILIKE '%ssri%' THEN 'SSRI'::therapeutic_class
        WHEN drug_class ILIKE '%snri%' THEN 'SNRI'::therapeutic_class
        WHEN drug_class ILIKE '%ppi%' OR drug_class ILIKE '%proton pump%' THEN 'PPI'::therapeutic_class
        WHEN drug_class ILIKE '%statin%' THEN 'STATIN'::therapeutic_class
        WHEN drug_class ILIKE '%nsaid%' THEN 'NSAID'::therapeutic_class
        WHEN drug_class ILIKE '%monoclonal%' OR drug_class ILIKE '%mab%' THEN 'mAb'::therapeutic_class
        WHEN drug_class ILIKE '%tnf%' OR drug_class ILIKE '%anti-tnf%' THEN 'ANTI_TNF'::therapeutic_class
        ELSE 'OTHER'::therapeutic_class
    END
WHERE therapeutic_class = 'OTHER' AND drug_class IS NOT NULL;

-- ============================================================================
-- 7. ADD DOCUMENT METADATA COLUMN
-- ============================================================================

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- ============================================================================
-- 8. CREATE AUDIT LOG ENTRY TYPE FOR V2 GENERATION
-- ============================================================================

-- Ensure audit_log table has the right structure
ALTER TABLE audit_log 
ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}';

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN projects.compound_type IS 'Type of compound: small_molecule, biologic, biosimilar, or atmp';
COMMENT ON COLUMN projects.therapeutic_class IS 'Therapeutic class for class-level fallbacks';
COMMENT ON COLUMN projects.study_phase IS 'Study phase (2, 3, or 4 only - Phase 1 not supported)';
COMMENT ON COLUMN projects.population_type IS 'Target population: adults, pediatric, geriatric, all';
COMMENT ON COLUMN projects.population_age_min IS 'Minimum age for study population';
COMMENT ON COLUMN projects.population_age_max IS 'Maximum age for study population';
COMMENT ON COLUMN projects.route_of_administration IS 'Route of administration: oral, iv, sc, im, topical, etc.';
COMMENT ON COLUMN projects.treatment_duration_weeks IS 'Planned treatment duration in weeks';
COMMENT ON COLUMN projects.enrichment_completed_at IS 'Timestamp when enrichment was last completed';
COMMENT ON COLUMN projects.ib_enrichment_data IS 'Cached IB enrichment data (IBInput)';
COMMENT ON COLUMN documents.metadata IS 'Document metadata including generator version, completeness scores';

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Ensure authenticated users can access new columns
GRANT SELECT, UPDATE ON projects TO authenticated;
GRANT SELECT, UPDATE ON documents TO authenticated;
