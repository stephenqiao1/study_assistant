-- Create study_durations table
CREATE TABLE IF NOT EXISTS study_durations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  study_session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('module', 'teach_back', 'flashcards')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS study_durations_user_id_idx ON study_durations(user_id);
CREATE INDEX IF NOT EXISTS study_durations_session_id_idx ON study_durations(study_session_id);
CREATE INDEX IF NOT EXISTS study_durations_activity_type_idx ON study_durations(activity_type);

-- Enable RLS
ALTER TABLE study_durations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own study durations" ON study_durations;
DROP POLICY IF EXISTS "Users can insert their own study durations" ON study_durations;
DROP POLICY IF EXISTS "Users can update their own study durations" ON study_durations;

-- Add RLS policies
CREATE POLICY "Users can view their own study durations"
  ON study_durations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study durations"
  ON study_durations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study durations"
  ON study_durations
  FOR UPDATE
  USING (auth.uid() = user_id); 