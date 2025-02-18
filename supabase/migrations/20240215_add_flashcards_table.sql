-- Create flashcards table
CREATE TABLE flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    module_title TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'learning', 'known')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own flashcards"
ON flashcards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcards"
ON flashcards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
ON flashcards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
ON flashcards FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX flashcards_module_title_idx ON flashcards(module_title);
CREATE INDEX flashcards_user_id_idx ON flashcards(user_id);
CREATE INDEX flashcards_status_idx ON flashcards(status); 