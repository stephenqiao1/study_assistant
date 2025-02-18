-- Create flashcards table
CREATE TABLE flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    study_session_id UUID NOT NULL REFERENCES study_sessions(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'learning', 'known')),
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ
);

-- Add RLS policies
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own flashcards
CREATE POLICY "Users can view their own flashcards" ON flashcards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_sessions
            WHERE study_sessions.id = flashcards.study_session_id
            AND study_sessions.user_id = auth.uid()
        )
    );

-- Create policy to allow users to create flashcards for their modules
CREATE POLICY "Users can create flashcards for their modules" ON flashcards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM study_sessions
            WHERE study_sessions.id = flashcards.study_session_id
            AND study_sessions.user_id = auth.uid()
        )
    );

-- Create policy to allow users to update their own flashcards
CREATE POLICY "Users can update their own flashcards" ON flashcards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM study_sessions
            WHERE study_sessions.id = flashcards.study_session_id
            AND study_sessions.user_id = auth.uid()
        )
    );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 