-- Drop virtual_chats table and related objects
DROP TABLE IF EXISTS virtual_chats;

-- Remove chat_messages from usage_tracking
ALTER TABLE usage_tracking DROP COLUMN IF EXISTS chat_message_count;

-- Update existing subscriptions to remove chat_messages from usage_limits
UPDATE subscriptions
SET usage_limits = usage_limits - 'chat_messages';

-- Remove virtual_chats from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS virtual_chats; 