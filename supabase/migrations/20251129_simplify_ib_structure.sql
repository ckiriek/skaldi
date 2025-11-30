-- Simplify IB structure to match ICH E6 standard format
-- Remove separate PK, PD, Toxicology sections (they are subsections of Nonclinical and Effects in Humans)

-- Delete the redundant sections
DELETE FROM document_structure 
WHERE document_type_id = 'ib' 
AND section_id IN ('ib_pharmacokinetics', 'ib_pharmacodynamics', 'ib_toxicology');

-- Update order_index for remaining sections
UPDATE document_structure 
SET order_index = 7 
WHERE document_type_id = 'ib' AND section_id = 'ib_clinical_studies';

UPDATE document_structure 
SET order_index = 8 
WHERE document_type_id = 'ib' AND section_id = 'ib_safety';

-- Also update titles to match ICH E6 standard
UPDATE document_structure 
SET title = 'Effects in Humans' 
WHERE document_type_id = 'ib' AND section_id = 'ib_clinical_studies';

UPDATE document_structure 
SET title = 'Summary of Data and Guidance for the Investigator' 
WHERE document_type_id = 'ib' AND section_id = 'ib_safety';
