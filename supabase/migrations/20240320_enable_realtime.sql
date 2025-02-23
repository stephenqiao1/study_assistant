-- Enable real-time for virtual_chats table
ALTER PUBLICATION supabase_realtime ADD TABLE virtual_chats;
ALTER TABLE virtual_chats REPLICA IDENTITY FULL;

-- Enable real-time for subscriptions table
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
ALTER TABLE subscriptions REPLICA IDENTITY FULL;

-- Enable real-time for study_sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE study_sessions;
ALTER TABLE study_sessions REPLICA IDENTITY FULL;

-- Enable real-time for teach_backs table
ALTER PUBLICATION supabase_realtime ADD TABLE teach_backs;
ALTER TABLE teach_backs REPLICA IDENTITY FULL;

-- Enable real-time for flashcards table
ALTER PUBLICATION supabase_realtime ADD TABLE flashcards;
ALTER TABLE flashcards REPLICA IDENTITY FULL; 