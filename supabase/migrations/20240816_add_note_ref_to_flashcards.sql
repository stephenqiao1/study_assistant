-- Add source_note_id column to flashcards table
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS source_note_id UUID REFERENCES notes(id) ON DELETE SET NULL;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS flashcards_source_note_id_idx ON flashcards(source_note_id); 