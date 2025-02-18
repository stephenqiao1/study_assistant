-- Add available_tools column to study_sessions table
ALTER TABLE study_sessions 
ADD COLUMN available_tools jsonb DEFAULT '["teachBack", "flashcards"]'::jsonb;

-- Update existing rows to have default tools
UPDATE study_sessions 
SET available_tools = '["teachBack", "flashcards"]'::jsonb 
WHERE available_tools IS NULL; 