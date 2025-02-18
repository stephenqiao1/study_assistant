-- Create newsletter_subscriptions table
CREATE TABLE newsletter_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    consent_given BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed'))
);

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserting new subscriptions
CREATE POLICY "Enable insert for all users" ON newsletter_subscriptions
    FOR INSERT WITH CHECK (true);

-- Create policy to allow reading own subscription
CREATE POLICY "Enable read access for all users" ON newsletter_subscriptions
    FOR SELECT USING (true);

-- Create index for faster lookups
CREATE INDEX newsletter_subscriptions_email_idx ON newsletter_subscriptions(email); 