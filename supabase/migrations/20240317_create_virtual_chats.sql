-- Create virtual_chats table
CREATE TABLE virtual_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    study_session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX virtual_chats_study_session_id_idx ON virtual_chats(study_session_id);
CREATE INDEX virtual_chats_user_id_idx ON virtual_chats(user_id);
CREATE INDEX virtual_chats_created_at_idx ON virtual_chats(created_at);

-- Enable RLS
ALTER TABLE virtual_chats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own virtual chats"
ON virtual_chats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own virtual chats"
ON virtual_chats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own virtual chats"
ON virtual_chats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own virtual chats"
ON virtual_chats FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_virtual_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_virtual_chats_updated_at
    BEFORE UPDATE ON virtual_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_virtual_chats_updated_at(); 