-- Seed regulatory_rules with basic QC checks from templates.md

-- Protocol QC Rules
INSERT INTO regulatory_rules (document_type_id, section_id, rule_type, rule_definition, severity, error_message) VALUES
('protocol', 'protocol_synopsis', 'consistency', '{"source": "protocol_synopsis", "target": "protocol_objectives", "match_type": "semantic"}', 'warning', 'Synopsis objectives should match Section 7 objectives'),
('protocol', 'protocol_schedule_of_assessments', 'presence', '{"target": "protocol_schedule_of_assessments"}', 'error', 'Schedule of Assessments must be present'),
('protocol', 'protocol_eligibility_criteria', 'custom', '{}', 'warning', 'Inclusion criteria should define age limits'),
('protocol', 'protocol_objectives', 'presence', '{"target": "protocol_objectives"}', 'error', 'Primary endpoint must be defined in objectives section'),
('protocol', 'protocol_statistics', 'custom', '{}', 'warning', 'Sample size calculation should reference the Primary Endpoint');

-- IB QC Rules
INSERT INTO regulatory_rules (document_type_id, section_id, rule_type, rule_definition, severity, error_message) VALUES
('ib', 'ib_nonclinical', 'custom', '{}', 'warning', 'Nonclinical summary must reference pharmacology and toxicology'),
('ib', 'ib_human_effects', 'presence', '{"target": "ib_human_effects"}', 'error', 'Clinical experience section must be present for Phase 2+'),
('ib', 'ib_guidance', 'custom', '{}', 'warning', 'Reference Safety Information (RSI) must be clearly identified');

-- CSR QC Rules
INSERT INTO regulatory_rules (document_type_id, section_id, rule_type, rule_definition, severity, error_message) VALUES
('csr', 'csr_populations', 'presence', '{"target": "csr_populations"}', 'error', 'Analysis populations (ITT, PP, Safety) must be defined'),
('csr', 'csr_safety_evaluation', 'presence', '{"target": "csr_safety_evaluation"}', 'error', 'AE summary table must exist'),
('csr', NULL, 'custom', '{}', 'warning', 'All appendices referenced in text must exist');

-- ICF QC Rules
INSERT INTO regulatory_rules (document_type_id, section_id, rule_type, rule_definition, severity, error_message) VALUES
('icf', NULL, 'custom', '{}', 'error', 'Must state that participation is voluntary'),
('icf', NULL, 'custom', '{}', 'error', 'Must mention the specific study drug'),
('icf', 'icf_signature', 'presence', '{"target": "icf_signature"}', 'error', 'Must list contacts for injury/questions'),
('icf', NULL, 'custom', '{}', 'warning', 'Language must be lay-friendly (readability score check)');

-- Synopsis QC Rules
INSERT INTO regulatory_rules (document_type_id, section_id, rule_type, rule_definition, severity, error_message) VALUES
('synopsis', 'synopsis_objectives', 'consistency', '{"source": "synopsis_objectives", "target": "protocol_objectives", "match_type": "semantic"}', 'warning', 'Synopsis objectives must align with Full Protocol'),
('synopsis', 'synopsis_design', 'consistency', '{"source": "synopsis_design", "target": "protocol_study_design", "match_type": "semantic"}', 'warning', 'Study Design must match flow diagram');

-- Style Guide entries (terminology preferences)
INSERT INTO style_guide (term, preferred_usage, forbidden_usage, context) VALUES
('subject', 'Use "subject" in clinical trial context', 'Avoid "patient" unless in medical care context', 'protocol'),
('adverse event', 'Use "adverse event (AE)" on first mention', 'Do not use "side effect"', 'all'),
('randomization', 'Use "randomization" (US spelling)', 'Avoid "randomisation" (UK spelling)', 'all'),
('placebo', 'Use "placebo" consistently', 'Avoid "dummy drug"', 'all');
