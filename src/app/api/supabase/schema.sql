-- Create the saved_videos table
CREATE TABLE IF NOT EXISTS saved_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_title TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  channel TEXT,
  published_at TEXT,
  video_url TEXT NOT NULL,
  note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Create a unique constraint to prevent duplicate saves
  UNIQUE (user_id, module_title, video_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS saved_videos_user_id_idx ON saved_videos(user_id);
CREATE INDEX IF NOT EXISTS saved_videos_module_title_idx ON saved_videos(module_title);
CREATE INDEX IF NOT EXISTS saved_videos_note_id_idx ON saved_videos(note_id); 