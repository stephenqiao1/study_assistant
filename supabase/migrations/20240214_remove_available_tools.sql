-- Remove available_tools column from study_sessions table
ALTER TABLE study_sessions DROP COLUMN IF EXISTS available_tools; 