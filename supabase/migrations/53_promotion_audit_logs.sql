-- ============================================
-- PROMOTION CHANGE AUDIT LOGS
-- ============================================
-- Tracks all promo code and promotion modifications
-- ============================================

-- Promotion change log table
CREATE TABLE IF NOT EXISTS promotion_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  promo_code TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'created', 'updated', 'disabled', 'deleted', 'usage_limit_changed'
  old_value JSONB,
  new_value JSONB NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_promotion_change_type CHECK (
    change_type IN ('created', 'updated', 'disabled', 'enabled', 'deleted', 'usage_limit_changed', 'discount_changed')
  )
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_promotion_change_log_promo_code ON promotion_change_log(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promotion_change_log_changed_by ON promotion_change_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_promotion_change_log_created ON promotion_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotion_change_log_type ON promotion_change_log(change_type);

-- Row Level Security
ALTER TABLE promotion_change_log ENABLE ROW LEVEL SECURITY;

-- Staff and admins can view promotion changes
CREATE POLICY "Staff and admins can view promotion changes" 
  ON promotion_change_log FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('staff', 'admin', 'marketing_manager')
    )
  );

-- Only staff/admins can insert promotion change logs
CREATE POLICY "Only staff can log promotion changes" 
  ON promotion_change_log FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('staff', 'admin', 'marketing_manager')
    )
  );

-- Function to log promo code creation
CREATE OR REPLACE FUNCTION log_promo_code_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO promotion_change_log (
    promo_code_id,
    promo_code,
    change_type,
    new_value,
    changed_by,
    reason
  ) VALUES (
    NEW.id,
    NEW.code,
    'created',
    jsonb_build_object(
      'code', NEW.code,
      'discount_type', NEW.discount_type,
      'discount_value', NEW.discount_value,
      'usage_limit', NEW.usage_limit,
      'valid_from', NEW.valid_from,
      'valid_until', NEW.valid_until,
      'is_active', NEW.is_active
    ),
    auth.uid(),
    'Promo code created'
  );
  
  RETURN NEW;
END;
$$;

-- Function to log promo code updates
CREATE OR REPLACE FUNCTION log_promo_code_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_change_type TEXT;
BEGIN
  -- Determine change type
  IF OLD.is_active != NEW.is_active THEN
    v_change_type := CASE WHEN NEW.is_active THEN 'enabled' ELSE 'disabled' END;
  ELSIF OLD.discount_value != NEW.discount_value OR OLD.discount_type != NEW.discount_type THEN
    v_change_type := 'discount_changed';
  ELSIF OLD.usage_limit != NEW.usage_limit THEN
    v_change_type := 'usage_limit_changed';
  ELSE
    v_change_type := 'updated';
  END IF;
  
  INSERT INTO promotion_change_log (
    promo_code_id,
    promo_code,
    change_type,
    old_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    NEW.id,
    NEW.code,
    v_change_type,
    jsonb_build_object(
      'code', OLD.code,
      'discount_type', OLD.discount_type,
      'discount_value', OLD.discount_value,
      'usage_limit', OLD.usage_limit,
      'valid_from', OLD.valid_from,
      'valid_until', OLD.valid_until,
      'is_active', OLD.is_active
    ),
    jsonb_build_object(
      'code', NEW.code,
      'discount_type', NEW.discount_type,
      'discount_value', NEW.discount_value,
      'usage_limit', NEW.usage_limit,
      'valid_from', NEW.valid_from,
      'valid_until', NEW.valid_until,
      'is_active', NEW.is_active
    ),
    auth.uid(),
    'Promo code updated'
  );
  
  RETURN NEW;
END;
$$;

-- Function to log promo code deletion
CREATE OR REPLACE FUNCTION log_promo_code_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO promotion_change_log (
    promo_code_id,
    promo_code,
    change_type,
    old_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    OLD.id,
    OLD.code,
    'deleted',
    jsonb_build_object(
      'code', OLD.code,
      'discount_type', OLD.discount_type,
      'discount_value', OLD.discount_value
    ),
    '{}'::jsonb,
    auth.uid(),
    'Promo code deleted'
  );
  
  RETURN OLD;
END;
$$;

-- Triggers for automatic logging
DROP TRIGGER IF EXISTS trigger_log_promo_code_creation ON promo_codes;
CREATE TRIGGER trigger_log_promo_code_creation
  AFTER INSERT ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION log_promo_code_creation();

DROP TRIGGER IF EXISTS trigger_log_promo_code_update ON promo_codes;
CREATE TRIGGER trigger_log_promo_code_update
  AFTER UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION log_promo_code_update();

DROP TRIGGER IF EXISTS trigger_log_promo_code_deletion ON promo_codes;
CREATE TRIGGER trigger_log_promo_code_deletion
  BEFORE DELETE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION log_promo_code_deletion();

-- Comments for clarity
COMMENT ON TABLE promotion_change_log IS 'Audit trail for all promo code and promotion changes';
COMMENT ON FUNCTION log_promo_code_creation IS 'Automatically logs promo code creation';
COMMENT ON FUNCTION log_promo_code_update IS 'Automatically logs promo code updates';
COMMENT ON FUNCTION log_promo_code_deletion IS 'Automatically logs promo code deletion';
