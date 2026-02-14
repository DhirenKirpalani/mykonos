-- Session Management
-- Track active user sessions for logout from all devices functionality

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session activity log
CREATE TABLE IF NOT EXISTS session_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'refresh', 'logout', 'expired', 'invalidated'
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_activity_log_session ON session_activity_log(session_id);

-- Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" 
  ON user_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
  ON user_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

ALTER TABLE session_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session activity" 
  ON session_activity_log FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions 
      WHERE user_sessions.id = session_activity_log.session_id 
      AND user_sessions.user_id = auth.uid()
    )
  );

-- Function to create new session
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO user_sessions (
    user_id,
    session_token,
    refresh_token,
    ip_address,
    user_agent,
    device_type,
    browser,
    os,
    country,
    city,
    expires_at
  ) VALUES (
    p_user_id,
    p_session_token,
    p_refresh_token,
    p_ip_address,
    p_user_agent,
    p_device_type,
    p_browser,
    p_os,
    p_country,
    p_city,
    p_expires_at
  ) RETURNING id INTO v_session_id;
  
  -- Log activity
  INSERT INTO session_activity_log (session_id, activity_type, ip_address)
  VALUES (v_session_id, 'login', p_ip_address);
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate session
CREATE OR REPLACE FUNCTION invalidate_session(
  p_session_id UUID,
  p_activity_type TEXT DEFAULT 'logout'
) RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions 
  SET 
    is_active = false,
    last_activity_at = NOW()
  WHERE id = p_session_id;
  
  -- Log activity
  INSERT INTO session_activity_log (session_id, activity_type)
  VALUES (p_session_id, p_activity_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate all user sessions (logout from all devices)
CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(
  p_user_id UUID,
  p_except_session_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_session RECORD;
BEGIN
  -- Invalidate all sessions except the specified one
  FOR v_session IN 
    SELECT id FROM user_sessions 
    WHERE user_id = p_user_id 
      AND is_active = true
      AND (p_except_session_id IS NULL OR id != p_except_session_id)
  LOOP
    PERFORM invalidate_session(v_session.id, 'invalidated');
  END LOOP;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(
  p_session_token TEXT,
  p_ip_address INET DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions 
  SET last_activity_at = NOW()
  WHERE session_token = p_session_token AND is_active = true;
  
  -- Optionally log activity
  IF FOUND THEN
    INSERT INTO session_activity_log (
      session_id, 
      activity_type, 
      ip_address
    )
    SELECT id, 'refresh', p_ip_address
    FROM user_sessions
    WHERE session_token = p_session_token;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_session RECORD;
BEGIN
  -- Mark expired sessions as inactive
  FOR v_session IN 
    SELECT id FROM user_sessions 
    WHERE expires_at < NOW() AND is_active = true
  LOOP
    PERFORM invalidate_session(v_session.id, 'expired');
  END LOOP;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active sessions for user
CREATE OR REPLACE FUNCTION get_user_active_sessions(
  p_user_id UUID
) RETURNS TABLE (
  id UUID,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    us.device_type,
    us.browser,
    us.os,
    us.ip_address,
    us.country,
    us.city,
    us.last_activity_at,
    us.created_at
  FROM user_sessions us
  WHERE us.user_id = p_user_id
    AND us.is_active = true
    AND us.expires_at > NOW()
  ORDER BY us.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to invalidate all sessions on password change
CREATE OR REPLACE FUNCTION invalidate_sessions_on_password_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if password was changed
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    PERFORM invalidate_all_user_sessions(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_password_change ON auth.users;
CREATE TRIGGER on_password_change
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
  EXECUTE FUNCTION invalidate_sessions_on_password_change();

-- Comments for clarity
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for multi-device logout functionality';
COMMENT ON TABLE session_activity_log IS 'Audit log for session activities';
