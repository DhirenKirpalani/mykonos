-- ============================================
-- PRICING CHANGE AUDIT LOGS
-- ============================================
-- Tracks all pricing modifications for audit trail
-- ============================================

-- Pricing change log table
CREATE TABLE IF NOT EXISTS pricing_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  old_compare_at_price DECIMAL(10,2),
  new_compare_at_price DECIMAL(10,2),
  change_type TEXT NOT NULL, -- 'price_update', 'sale_price', 'regional_price'
  region_id UUID REFERENCES regions(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_change_type CHECK (change_type IN ('price_update', 'sale_price', 'regional_price', 'bulk_update'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_product ON pricing_change_log(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_changed_by ON pricing_change_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_created ON pricing_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_region ON pricing_change_log(region_id);

-- Row Level Security
ALTER TABLE pricing_change_log ENABLE ROW LEVEL SECURITY;

-- Staff and admins can view pricing changes
CREATE POLICY "Staff and admins can view pricing changes" 
  ON pricing_change_log FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('staff', 'admin', 'marketing_manager')
    )
  );

-- Only admins can insert pricing change logs (via functions)
CREATE POLICY "Only admins can log pricing changes" 
  ON pricing_change_log FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('staff', 'admin', 'marketing_manager')
    )
  );

-- Function to log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if price actually changed
  IF (OLD.price IS DISTINCT FROM NEW.price) OR 
     (OLD.compare_at_price IS DISTINCT FROM NEW.compare_at_price) THEN
    
    INSERT INTO pricing_change_log (
      product_id,
      old_price,
      new_price,
      old_compare_at_price,
      new_compare_at_price,
      change_type,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.price,
      NEW.price,
      OLD.compare_at_price,
      NEW.compare_at_price,
      'price_update',
      auth.uid(),
      'Product price updated'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically log price changes on products table
DROP TRIGGER IF EXISTS trigger_log_product_price_change ON products;
CREATE TRIGGER trigger_log_product_price_change
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price OR OLD.compare_at_price IS DISTINCT FROM NEW.compare_at_price)
  EXECUTE FUNCTION log_price_change();

-- Function to manually log regional price changes
CREATE OR REPLACE FUNCTION log_regional_price_change(
  p_product_id UUID,
  p_region_id UUID,
  p_old_price DECIMAL,
  p_new_price DECIMAL,
  p_reason TEXT DEFAULT NULL
)
RETURNS pricing_change_log
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result pricing_change_log;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('staff', 'admin', 'marketing_manager')
  ) THEN
    RAISE EXCEPTION 'Only staff can log regional price changes';
  END IF;
  
  INSERT INTO pricing_change_log (
    product_id,
    old_price,
    new_price,
    change_type,
    region_id,
    changed_by,
    reason
  ) VALUES (
    p_product_id,
    p_old_price,
    p_new_price,
    'regional_price',
    p_region_id,
    v_user_id,
    p_reason
  )
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Comments for clarity
COMMENT ON TABLE pricing_change_log IS 'Audit trail for all product pricing changes';
COMMENT ON FUNCTION log_price_change IS 'Automatically logs price changes when products are updated';
COMMENT ON FUNCTION log_regional_price_change IS 'Manually logs regional pricing changes';
