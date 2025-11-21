-- Create document_types table
CREATE TABLE IF NOT EXISTS document_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    regulatory_standard TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create document_structure table
CREATE TABLE IF NOT EXISTS document_structure (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_type_id TEXT REFERENCES document_types(id) ON DELETE CASCADE NOT NULL,
    section_id TEXT NOT NULL,
    parent_section_id TEXT, -- Logical hierarchy
    order_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    is_repeatable BOOLEAN DEFAULT false,
    level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_type_id TEXT REFERENCES document_types(id) ON DELETE CASCADE NOT NULL,
    section_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    language TEXT NOT NULL DEFAULT 'en',
    template_content TEXT,
    prompt_text TEXT,
    expected_inputs JSONB DEFAULT '[]'::jsonb,
    constraints JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create document_examples table
CREATE TABLE IF NOT EXISTS document_examples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_type_id TEXT REFERENCES document_types(id) ON DELETE CASCADE NOT NULL,
    section_id TEXT NOT NULL,
    content TEXT NOT NULL,
    source_document TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create regulatory_rules table
CREATE TABLE IF NOT EXISTS regulatory_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_type_id TEXT REFERENCES document_types(id) ON DELETE CASCADE NOT NULL,
    section_id TEXT, -- Nullable for document-level rules
    rule_type TEXT NOT NULL, -- 'presence', 'consistency', 'terminology', 'custom'
    rule_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
    logic_expression TEXT,
    severity TEXT NOT NULL DEFAULT 'error', -- 'error', 'warning', 'info'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create style_guide table
CREATE TABLE IF NOT EXISTS style_guide (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    term TEXT NOT NULL,
    preferred_usage TEXT,
    forbidden_usage TEXT,
    context TEXT DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_structure_type ON document_structure(document_type_id);
CREATE INDEX IF NOT EXISTS idx_document_structure_parent ON document_structure(parent_section_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_lookup ON document_templates(document_type_id, section_id, language, is_active);
CREATE INDEX IF NOT EXISTS idx_document_examples_lookup ON document_examples(document_type_id, section_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_lookup ON regulatory_rules(document_type_id, section_id);

-- Enable Row Level Security
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_guide ENABLE ROW LEVEL SECURITY;

-- Create simple policies (Authenticated users can read all, write usually restricted but for dev we allow all for now)
-- In a real production app, we might restrict writes to admins.

-- Policies for document_types
CREATE POLICY "Allow read access for authenticated users" ON document_types
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON document_types
    FOR ALL TO authenticated USING (true);

-- Policies for document_structure
CREATE POLICY "Allow read access for authenticated users" ON document_structure
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON document_structure
    FOR ALL TO authenticated USING (true);

-- Policies for document_templates
CREATE POLICY "Allow read access for authenticated users" ON document_templates
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON document_templates
    FOR ALL TO authenticated USING (true);

-- Policies for document_examples
CREATE POLICY "Allow read access for authenticated users" ON document_examples
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON document_examples
    FOR ALL TO authenticated USING (true);

-- Policies for regulatory_rules
CREATE POLICY "Allow read access for authenticated users" ON regulatory_rules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON regulatory_rules
    FOR ALL TO authenticated USING (true);

-- Policies for style_guide
CREATE POLICY "Allow read access for authenticated users" ON style_guide
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON style_guide
    FOR ALL TO authenticated USING (true);

-- Seed initial document types
INSERT INTO document_types (id, name, description, regulatory_standard) VALUES
('protocol', 'Clinical Study Protocol', 'Describes objective(s), design, methodology, statistical considerations, and organization of a trial.', 'ICH E6 (GCP)'),
('ib', 'Investigator''s Brochure', 'Compilation of the clinical and nonclinical data on the investigational product(s).', 'ICH E6'),
('csr', 'Clinical Study Report', 'Integrated full report of an individual study.', 'ICH E3'),
('icf', 'Informed Consent Form', 'Document used to provide information to a subject to allow them to make an informed decision.', 'GCP'),
('synopsis', 'Protocol Synopsis', 'Brief summary of the key elements of the protocol.', 'ICH E6'),
('spc', 'Product Summary / SPC', 'Summary of Product Characteristics.', 'EMA/FDA Labeling')
ON CONFLICT (id) DO NOTHING;
