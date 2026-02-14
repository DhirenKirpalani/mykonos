-- Terms of Service Acceptance Tracking

-- Add terms acceptance to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE;

-- Terms acceptance log for audit trail
CREATE TABLE IF NOT EXISTS terms_acceptance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT,
  ip_address INET,
  user_agent TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_terms_log_user ON terms_acceptance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_log_accepted ON terms_acceptance_log(accepted_at);

-- Row Level Security
ALTER TABLE terms_acceptance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own terms acceptance log" 
  ON terms_acceptance_log FOR SELECT 
  USING (auth.uid() = user_id);

-- Function to record terms acceptance
CREATE OR REPLACE FUNCTION record_terms_acceptance(
  p_user_id UUID,
  p_terms_version TEXT DEFAULT '1.0',
  p_privacy_version TEXT DEFAULT '1.0',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update users table
  UPDATE users
  SET 
    terms_accepted_at = NOW(),
    terms_version = p_terms_version,
    privacy_accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log acceptance
  INSERT INTO terms_acceptance_log (
    user_id,
    terms_version,
    privacy_version,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_terms_version,
    p_privacy_version,
    p_ip_address,
    p_user_agent
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE terms_acceptance_log IS 'Audit trail for terms of service and privacy policy acceptance';
COMMENT ON FUNCTION record_terms_acceptance IS 'Records user acceptance of terms and privacy policy';
