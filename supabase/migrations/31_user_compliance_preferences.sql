-- User Compliance and Preferences
-- Track ToS/Privacy Policy acceptance and region preferences

-- Add compliance and preference fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_region_id UUID REFERENCES regions(id);

-- Create index for region preference lookups
CREATE INDEX IF NOT EXISTS idx_users_preferred_region ON users(preferred_region_id);

-- Function to record terms acceptance
CREATE OR REPLACE FUNCTION accept_terms_and_privacy(
  p_user_id UUID,
  p_terms_version TEXT,
  p_privacy_version TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET 
    terms_accepted = true,
    terms_accepted_at = NOW(),
    terms_version = p_terms_version,
    privacy_accepted = true,
    privacy_accepted_at = NOW(),
    privacy_version = p_privacy_version,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user's preferred region
CREATE OR REPLACE FUNCTION set_preferred_region(
  p_user_id UUID,
  p_region_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Verify region exists and is active
  IF NOT EXISTS (SELECT 1 FROM regions WHERE id = p_region_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive region';
  END IF;
  
  UPDATE users 
  SET 
    preferred_region_id = p_region_id,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Visitor preferences table (for non-authenticated users)
CREATE TABLE IF NOT EXISTS visitor_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  preferred_region_id UUID REFERENCES regions(id),
  ip_address INET,
  browser_locale TEXT,
  detected_country_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visitor_preferences_session ON visitor_preferences(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_preferences_expires ON visitor_preferences(expires_at);

-- Row Level Security
ALTER TABLE visitor_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitors can view their own preferences" 
  ON visitor_preferences FOR SELECT 
  USING (true);

CREATE POLICY "Visitors can insert their own preferences" 
  ON visitor_preferences FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Visitors can update their own preferences" 
  ON visitor_preferences FOR UPDATE 
  USING (true);

-- Function to set visitor region preference
CREATE OR REPLACE FUNCTION set_visitor_region_preference(
  p_session_id TEXT,
  p_region_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_browser_locale TEXT DEFAULT NULL,
  p_detected_country_code TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_preference_id UUID;
BEGIN
  -- Verify region exists and is active
  IF NOT EXISTS (SELECT 1 FROM regions WHERE id = p_region_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive region';
  END IF;
  
  -- Insert or update preference
  INSERT INTO visitor_preferences (
    session_id, 
    preferred_region_id, 
    ip_address, 
    browser_locale, 
    detected_country_code
  )
  VALUES (
    p_session_id, 
    p_region_id, 
    p_ip_address, 
    p_browser_locale, 
    p_detected_country_code
  )
  ON CONFLICT (session_id) 
  DO UPDATE SET
    preferred_region_id = EXCLUDED.preferred_region_id,
    updated_at = NOW()
  RETURNING id INTO v_preference_id;
  
  RETURN v_preference_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired visitor preferences
CREATE OR REPLACE FUNCTION cleanup_expired_visitor_preferences() RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM visitor_preferences 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
