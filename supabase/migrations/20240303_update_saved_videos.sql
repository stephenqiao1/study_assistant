-- Add study_session_id column to saved_videos table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'saved_videos' AND column_name = 'study_session_id') THEN
        ALTER TABLE saved_videos 
        ADD COLUMN study_session_id UUID REFERENCES study_sessions(id);
        
        -- Update existing saved_videos to set the study_session_id based on module_title
        UPDATE saved_videos sv
        SET study_session_id = ss.id
        FROM study_sessions ss
        WHERE sv.module_title = ss.module_title
          AND sv.user_id = ss.user_id;
          
        -- Create an index for better query performance
        CREATE INDEX idx_saved_videos_study_session_id ON saved_videos(study_session_id);
    END IF;
END $$; 