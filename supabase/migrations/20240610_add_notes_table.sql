-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for querying
CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_study_session_id_idx ON notes(study_session_id);
CREATE INDEX notes_created_at_idx ON notes(created_at);

-- Add RLS policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- User can only read their own notes
CREATE POLICY notes_select ON notes
  FOR SELECT USING (auth.uid() = user_id);

-- User can only insert their own notes
CREATE POLICY notes_insert ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User can only update their own notes
CREATE POLICY notes_update ON notes
  FOR UPDATE USING (auth.uid() = user_id);

-- User can only delete their own notes
CREATE POLICY notes_delete ON notes
  FOR DELETE USING (auth.uid() = user_id); 