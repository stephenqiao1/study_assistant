-- Create teach_backs table
CREATE TABLE teach_backs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    study_session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX teach_backs_study_session_id_idx ON teach_backs(study_session_id);
CREATE INDEX teach_backs_user_id_idx ON teach_backs(user_id);
CREATE INDEX teach_backs_created_at_idx ON teach_backs(created_at);

-- Enable RLS
ALTER TABLE teach_backs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own teach backs"
ON teach_backs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own teach backs"
ON teach_backs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teach backs"
ON teach_backs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teach backs"
ON teach_backs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_teach_backs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teach_backs_updated_at
    BEFORE UPDATE ON teach_backs
    FOR EACH ROW
    EXECUTE FUNCTION update_teach_backs_updated_at(); 