-- ============================================
-- EMERGENCY ORDER OVERRIDE
-- ============================================
-- Allows admins to override locked order states in emergencies
-- ============================================

-- Order override log table
CREATE TABLE IF NOT EXISTS order_override_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  override_reason TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_override_log_order ON order_override_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_override_log_overridden_by ON order_override_log(overridden_by);
CREATE INDEX IF NOT EXISTS idx_order_override_log_created ON order_override_log(created_at DESC);

-- Row Level Security
ALTER TABLE order_override_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view override logs
CREATE POLICY "Only admins can view override logs" 
  ON order_override_log FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Function to override locked order state (admin only)
CREATE OR REPLACE FUNCTION emergency_override_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_reason TEXT
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_old_status TEXT;
  v_result orders;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can perform emergency order overrides';
  END IF;
  
  -- Validate reason is provided
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Override reason must be at least 10 characters';
  END IF;
  
  -- Get current order status
  SELECT status INTO v_old_status
  FROM orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Update order status (bypassing normal constraints)
  UPDATE orders
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_result;
  
  -- Log the override
  INSERT INTO order_override_log (
    order_id,
    old_status,
    new_status,
    override_reason,
    overridden_by
  ) VALUES (
    p_order_id,
    v_old_status,
    p_new_status,
    p_reason,
    v_user_id
  );
  
  RETURN v_result;
END;
$$;

-- Function to unlock order for editing (admin only)
CREATE OR REPLACE FUNCTION unlock_order_for_editing(
  p_order_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can unlock orders';
  END IF;
  
  -- Log the unlock action
  INSERT INTO order_override_log (
    order_id,
    old_status,
    new_status,
    override_reason,
    overridden_by
  )
  SELECT 
    p_order_id,
    status,
    status || ' (unlocked)',
    p_reason,
    v_user_id
  FROM orders
  WHERE id = p_order_id;
  
  RETURN TRUE;
END;
$$;

-- Comments for clarity
COMMENT ON TABLE order_override_log IS 'Audit trail for emergency order status overrides by admins';
COMMENT ON FUNCTION emergency_override_order_status IS 'Allows admins to override locked order states in emergencies';
COMMENT ON FUNCTION unlock_order_for_editing IS 'Allows admins to temporarily unlock orders for editing';
