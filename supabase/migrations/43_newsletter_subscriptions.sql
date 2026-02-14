-- Newsletter Subscriptions

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'website', -- 'website', 'checkout', 'account'
  preferences JSONB DEFAULT '{"marketing": true, "product_updates": true, "promotions": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_user ON newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(is_active);

-- Row Level Security
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" 
  ON newsletter_subscriptions FOR SELECT 
  USING (auth.uid() = user_id OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe" 
  ON newsletter_subscriptions FOR INSERT 
  WITH CHECK (true);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription" 
  ON newsletter_subscriptions FOR UPDATE 
  USING (auth.uid() = user_id OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Function to subscribe to newsletter
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(
  p_email TEXT,
  p_source TEXT DEFAULT 'website'
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
  v_user_id UUID;
BEGIN
  -- Get user_id if email belongs to a registered user
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  -- Insert or update subscription
  INSERT INTO newsletter_subscriptions (email, user_id, is_active, source, subscribed_at)
  VALUES (p_email, v_user_id, true, p_source, NOW())
  ON CONFLICT (email) 
  DO UPDATE SET 
    is_active = true,
    subscribed_at = NOW(),
    unsubscribed_at = NULL,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsubscribe from newsletter
CREATE OR REPLACE FUNCTION unsubscribe_from_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE newsletter_subscriptions
  SET 
    is_active = false,
    unsubscribed_at = NOW(),
    updated_at = NOW()
  WHERE email = p_email;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE newsletter_subscriptions IS 'Email newsletter subscriptions with preferences';
