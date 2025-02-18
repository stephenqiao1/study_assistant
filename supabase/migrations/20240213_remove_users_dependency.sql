-- Drop the foreign key constraint
ALTER TABLE study_sessions
DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;

-- Drop the users table if it exists
DROP TABLE IF EXISTS users;

-- Update RLS policies to use auth.uid() directly
ALTER POLICY "Users can view their own study sessions" ON study_sessions
    USING (auth.uid() = user_id);

ALTER POLICY "Users can create study sessions" ON study_sessions
    USING (auth.uid() = user_id);

ALTER POLICY "Users can update their own study sessions" ON study_sessions
    USING (auth.uid() = user_id); 