-- Add icon_name field to projects table for visual identification
-- Icons are from Lucide icon set (medical-themed)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'Pill';

-- Add check constraint for valid icon names
ALTER TABLE projects ADD CONSTRAINT valid_icon_name 
  CHECK (icon_name IN ('Pill', 'Syringe', 'Microscope', 'Dna', 'HeartPulse', 'Stethoscope', 'TestTube', 'Activity', 'Brain', 'Droplet'));
