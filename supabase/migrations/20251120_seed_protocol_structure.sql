-- Seed document_structure for Protocol
-- Based on ICH E6 and standard protocol structure

INSERT INTO document_structure (document_type_id, section_id, title, parent_section_id, order_index, level, is_required) VALUES
-- Level 1: Main sections
('protocol', 'protocol_title_page', 'Title Page', NULL, 1, 1, true),
('protocol', 'protocol_synopsis', 'Protocol Synopsis', NULL, 2, 1, true),
('protocol', 'protocol_introduction', 'Introduction and Background', NULL, 3, 1, true),
('protocol', 'protocol_objectives', 'Study Objectives and Endpoints', NULL, 4, 1, true),
('protocol', 'protocol_study_design', 'Study Design', NULL, 5, 1, true),
('protocol', 'protocol_eligibility_criteria', 'Selection of Study Population', NULL, 6, 1, true),
('protocol', 'protocol_treatments', 'Treatment of Subjects', NULL, 7, 1, true),
('protocol', 'protocol_schedule_of_assessments', 'Schedule of Assessments', NULL, 8, 1, true),
('protocol', 'protocol_safety_monitoring', 'Safety Monitoring and Reporting', NULL, 9, 1, true),
('protocol', 'protocol_statistics', 'Statistical Considerations', NULL, 10, 1, true),
('protocol', 'protocol_ethics', 'Ethics and Regulatory Considerations', NULL, 11, 1, true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_structure_type_order 
ON document_structure(document_type_id, order_index);

CREATE INDEX IF NOT EXISTS idx_document_structure_parent 
ON document_structure(parent_section_id);
