-- Add study_session_id column to flashcards table
ALTER TABLE flashcards ADD COLUMN study_session_id UUID REFERENCES study_sessions(id);

-- Create index for faster querying
CREATE INDEX flashcards_study_session_id_idx ON flashcards(study_session_id);

-- Populate study_session_id based on user_id and module_title
UPDATE flashcards f
SET study_session_id = ss.id
FROM study_sessions ss
WHERE f.user_id = ss.user_id AND f.module_title = ss.module_title; 