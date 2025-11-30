-- ============================================
-- SAP (Statistical Analysis Plan) Document Structure
-- ICH E9 compliant structure for statistical analysis plans
-- Date: 2025-11-29
-- ============================================

-- First, ensure 'sap' exists in document_types
INSERT INTO document_types (id, name, description, created_at, updated_at)
VALUES (
  'sap',
  'Statistical Analysis Plan',
  'ICH E9 compliant Statistical Analysis Plan for clinical trials',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- SAP Document Structure (14 sections per ICH E9)
-- ============================================
INSERT INTO document_structure (document_type_id, section_id, title, parent_section_id, order_index, level, is_required) VALUES
('sap', 'sap_title_page', 'Title Page', NULL, 1, 1, true),
('sap', 'sap_toc', 'Table of Contents', NULL, 2, 1, true),
('sap', 'sap_introduction', 'Introduction', NULL, 3, 1, true),
('sap', 'sap_objectives_endpoints', 'Study Objectives and Endpoints', NULL, 4, 1, true),
('sap', 'sap_study_design', 'Study Design Overview', NULL, 5, 1, true),
('sap', 'sap_analysis_populations', 'Analysis Populations', NULL, 6, 1, true),
('sap', 'sap_statistical_methods', 'Statistical Methods', NULL, 7, 1, true),
('sap', 'sap_primary_analysis', 'Analysis of Primary Endpoint', NULL, 8, 1, true),
('sap', 'sap_secondary_analysis', 'Analysis of Secondary Endpoints', NULL, 9, 1, true),
('sap', 'sap_safety_analysis', 'Safety Analyses', NULL, 10, 1, true),
('sap', 'sap_interim_analysis', 'Interim Analysis', NULL, 11, 1, false),
('sap', 'sap_changes_from_protocol', 'Changes from Protocol', NULL, 12, 1, true),
('sap', 'sap_references', 'References', NULL, 13, 1, true),
('sap', 'sap_appendices', 'Appendices', NULL, 14, 1, true)
ON CONFLICT (document_type_id, section_id) DO UPDATE SET
  title = EXCLUDED.title,
  parent_section_id = EXCLUDED.parent_section_id,
  order_index = EXCLUDED.order_index,
  level = EXCLUDED.level,
  is_required = EXCLUDED.is_required;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_structure_sap 
ON document_structure(document_type_id, order_index)
WHERE document_type_id = 'sap';

-- Comments
COMMENT ON TABLE document_structure IS 'Document structure for all clinical document types: Protocol, IB, ICF, Synopsis, CSR, SPC, SAP';
