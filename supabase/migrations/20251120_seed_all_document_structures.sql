-- Seed document_structure for all document types
-- Based on ICH guidelines and standard clinical documentation

-- ============================================
-- IB (Investigator's Brochure) - ICH E6 Section 7
-- ============================================
INSERT INTO document_structure (document_type_id, section_id, title, parent_section_id, order_index, level, is_required) VALUES
-- Level 1: Main sections
('ib', 'ib_title_page', 'Title Page', NULL, 1, 1, true),
('ib', 'ib_toc', 'Table of Contents', NULL, 2, 1, true),
('ib', 'ib_summary', 'Summary', NULL, 3, 1, true),
('ib', 'ib_introduction', 'Introduction', NULL, 4, 1, true),
('ib', 'ib_physical_chemical', 'Physical, Chemical, and Pharmaceutical Properties', NULL, 5, 1, true),
('ib', 'ib_nonclinical', 'Nonclinical Studies', NULL, 6, 1, true),
('ib', 'ib_pharmacokinetics', 'Pharmacokinetics and Product Metabolism', NULL, 7, 1, true),
('ib', 'ib_pharmacodynamics', 'Pharmacodynamics and Mechanism of Action', NULL, 8, 1, true),
('ib', 'ib_toxicology', 'Toxicology', NULL, 9, 1, true),
('ib', 'ib_clinical_studies', 'Effects in Humans', NULL, 10, 1, true),
('ib', 'ib_safety', 'Summary of Data and Guidance for Investigator', NULL, 11, 1, true);

-- ============================================
-- ICF (Informed Consent Form)
-- ============================================
INSERT INTO document_structure (document_type_id, section_id, title, parent_section_id, order_index, level, is_required) VALUES
('icf', 'icf_title', 'Title and Introduction', NULL, 1, 1, true),
('icf', 'icf_purpose', 'Purpose of the Study', NULL, 2, 1, true),
('icf', 'icf_procedures', 'Study Procedures', NULL, 3, 1, true),
('icf', 'icf_duration', 'Duration of Participation', NULL, 4, 1, true),
('icf', 'icf_risks', 'Risks and Discomforts', NULL, 5, 1, true),
('icf', 'icf_benefits', 'Potential Benefits', NULL, 6, 1, true),
('icf', 'icf_alternatives', 'Alternative Treatments', NULL, 7, 1, true),
('icf', 'icf_confidentiality', 'Confidentiality', NULL, 8, 1, true),
('icf', 'icf_compensation', 'Compensation and Costs', NULL, 9, 1, true),
('icf', 'icf_voluntary', 'Voluntary Participation', NULL, 10, 1, true),
('icf', 'icf_contacts', 'Contact Information', NULL, 11, 1, true),
('icf', 'icf_signature', 'Signature Page', NULL, 12, 1, true);

-- ============================================
-- Synopsis
-- ============================================
INSERT INTO document_structure (document_type_id, section_id, title, parent_section_id, order_index, level, is_required) VALUES
('synopsis', 'synopsis_title', 'Title', NULL, 1, 1, true),
('synopsis', 'synopsis_rationale', 'Rationale', NULL, 2, 1, true),
('synopsis', 'synopsis_objectives', 'Objectives', NULL, 3, 1, true),
('synopsis', 'synopsis_design', 'Study Design', NULL, 4, 1, true),
('synopsis', 'synopsis_population', 'Study Population', NULL, 5, 1, true),
('synopsis', 'synopsis_treatments', 'Study Treatments', NULL, 6, 1, true),
('synopsis', 'synopsis_endpoints', 'Endpoints', NULL, 7, 1, true),
('synopsis', 'synopsis_statistics', 'Statistical Methods', NULL, 8, 1, true);

-- ============================================
-- CSR (Clinical Study Report) - ICH E3
-- ============================================
INSERT INTO document_structure (document_type_id, section_id, title, parent_section_id, order_index, level, is_required) VALUES
('csr', 'csr_title_page', 'Title Page', NULL, 1, 1, true),
('csr', 'csr_synopsis', 'Synopsis', NULL, 2, 1, true),
('csr', 'csr_toc', 'Table of Contents', NULL, 3, 1, true),
('csr', 'csr_abbreviations', 'List of Abbreviations', NULL, 4, 1, true),
('csr', 'csr_ethics', 'Ethics', NULL, 5, 1, true),
('csr', 'csr_investigators', 'Investigators and Study Centers', NULL, 6, 1, true),
('csr', 'csr_introduction', 'Introduction', NULL, 7, 1, true),
('csr', 'csr_objectives', 'Study Objectives', NULL, 8, 1, true),
('csr', 'csr_plan', 'Plan and Conduct of Study', NULL, 9, 1, true),
('csr', 'csr_patients', 'Patients', NULL, 10, 1, true),
('csr', 'csr_efficacy', 'Efficacy Evaluation', NULL, 11, 1, true),
('csr', 'csr_safety', 'Safety Evaluation', NULL, 12, 1, true),
('csr', 'csr_discussion', 'Discussion and Conclusions', NULL, 13, 1, true),
('csr', 'csr_references', 'References', NULL, 14, 1, true);

-- ============================================
-- SPC (Summary of Product Characteristics)
-- ============================================
INSERT INTO document_structure (document_type_id, section_id, title, parent_section_id, order_index, level, is_required) VALUES
('spc', 'spc_name', 'Name of the Medicinal Product', NULL, 1, 1, true),
('spc', 'spc_composition', 'Qualitative and Quantitative Composition', NULL, 2, 1, true),
('spc', 'spc_pharmaceutical_form', 'Pharmaceutical Form', NULL, 3, 1, true),
('spc', 'spc_indications', 'Therapeutic Indications', NULL, 4, 1, true),
('spc', 'spc_posology', 'Posology and Method of Administration', NULL, 5, 1, true),
('spc', 'spc_contraindications', 'Contraindications', NULL, 6, 1, true),
('spc', 'spc_warnings', 'Special Warnings and Precautions', NULL, 7, 1, true),
('spc', 'spc_interactions', 'Interaction with Other Medicinal Products', NULL, 8, 1, true),
('spc', 'spc_fertility', 'Fertility, Pregnancy and Lactation', NULL, 9, 1, true),
('spc', 'spc_driving', 'Effects on Ability to Drive', NULL, 10, 1, true),
('spc', 'spc_undesirable_effects', 'Undesirable Effects', NULL, 11, 1, true),
('spc', 'spc_overdose', 'Overdose', NULL, 12, 1, true),
('spc', 'spc_pharmacodynamics', 'Pharmacodynamic Properties', NULL, 13, 1, true),
('spc', 'spc_pharmacokinetics', 'Pharmacokinetic Properties', NULL, 14, 1, true),
('spc', 'spc_preclinical', 'Preclinical Safety Data', NULL, 15, 1, true),
('spc', 'spc_pharmaceutical_particulars', 'Pharmaceutical Particulars', NULL, 16, 1, true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_structure_type_order_all 
ON document_structure(document_type_id, order_index)
WHERE document_type_id IN ('ib', 'icf', 'synopsis', 'csr', 'spc');

-- Comments
COMMENT ON TABLE document_structure IS 'Document structure for all clinical document types: Protocol, IB, ICF, Synopsis, CSR, SPC';
