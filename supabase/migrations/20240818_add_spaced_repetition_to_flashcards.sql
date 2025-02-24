-- Add spaced repetition columns to flashcards table
ALTER TABLE flashcards ADD ease_factor NUMERIC DEFAULT 2.5;
ALTER TABLE flashcards ADD review_interval INTEGER DEFAULT 0;
ALTER TABLE flashcards ADD repetitions INTEGER DEFAULT 0;
ALTER TABLE flashcards ADD last_recall_rating TEXT;

-- Add check constraint for last_recall_rating
ALTER TABLE flashcards ADD CONSTRAINT check_last_recall_rating 
CHECK (last_recall_rating IS NULL OR last_recall_rating IN ('easy', 'good', 'hard', 'forgot')); 