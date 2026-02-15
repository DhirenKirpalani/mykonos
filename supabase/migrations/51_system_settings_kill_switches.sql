-- ============================================
-- SYSTEM SETTINGS & OPERATIONAL KILL SWITCHES
-- ============================================
-- Allows admins to control system-wide operational features
-- ============================================

-- System settings table for operational controls
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Audit log for system setting changes
CREATE TABLE IF NOT EXISTS system_settings_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_log_key ON system_settings_log(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_log_created ON system_settings_log(created_at DESC);

-- Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view system settings
CREATE POLICY "Only admins can view system settings" 
  ON system_settings FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only admins can modify system settings
CREATE POLICY "Only admins can modify system settings" 
  ON system_settings FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admins can view all setting change logs
CREATE POLICY "Admins can view all setting changes" 
  ON system_settings_log FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Function to update system setting with audit logging
CREATE OR REPLACE FUNCTION update_system_setting(
  p_setting_key TEXT,
  p_new_value JSONB,
  p_reason TEXT DEFAULT NULL
)
RETURNS system_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_old_value JSONB;
  v_result system_settings;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update system settings';
  END IF;
  
  -- Get old value if exists
  SELECT setting_value INTO v_old_value
  FROM system_settings
  WHERE setting_key = p_setting_key;
  
  -- Upsert the setting
  INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
  VALUES (p_setting_key, p_new_value, v_user_id, NOW())
  ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = p_new_value,
    updated_by = v_user_id,
    updated_at = NOW()
  RETURNING * INTO v_result;
  
  -- Log the change
  INSERT INTO system_settings_log (setting_key, old_value, new_value, changed_by, reason)
  VALUES (p_setting_key, v_old_value, p_new_value, v_user_id, p_reason);
  
  RETURN v_result;
END;
$$;

-- Function to get system setting value
CREATE OR REPLACE FUNCTION get_system_setting(p_setting_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT setting_value INTO v_value
  FROM system_settings
  WHERE setting_key = p_setting_key;
  
  RETURN COALESCE(v_value, '{}'::jsonb);
END;
$$;

-- Insert default operational kill switches
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('checkout_enabled', '{"enabled": true}'::jsonb, 'Controls whether checkout is available'),
  ('payments_enabled', '{"enabled": true}'::jsonb, 'Controls whether payment processing is enabled'),
  ('promo_codes_enabled', '{"enabled": true}'::jsonb, 'Controls whether promo codes can be applied'),
  ('maintenance_mode', '{"enabled": false, "message": "We are currently performing maintenance. Please check back soon."}'::jsonb, 'Controls site-wide maintenance mode'),
  ('disabled_regions', '{"regions": []}'::jsonb, 'List of region IDs that are temporarily disabled')
ON CONFLICT (setting_key) DO NOTHING;

-- Comments for clarity
COMMENT ON TABLE system_settings IS 'System-wide operational settings and kill switches';
COMMENT ON TABLE system_settings_log IS 'Audit log for all system setting changes';
COMMENT ON FUNCTION update_system_setting IS 'Updates a system setting with audit logging (admin only)';
COMMENT ON FUNCTION get_system_setting IS 'Retrieves a system setting value';
