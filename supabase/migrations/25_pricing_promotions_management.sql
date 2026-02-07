-- Pricing & Promotions Management Enhancements
-- Support for regional pricing, sale scheduling, and promo code management

-- Add sale scheduling to product_regional_pricing
ALTER TABLE product_regional_pricing ADD COLUMN IF NOT EXISTS sale_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE product_regional_pricing ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE product_regional_pricing ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- Add management fields to promo_codes
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS disabled_by UUID REFERENCES auth.users(id);

-- Indexes for sale scheduling
CREATE INDEX IF NOT EXISTS idx_product_regional_pricing_sale_dates ON product_regional_pricing(sale_start_date, sale_end_date);

-- Enhanced RLS policies for pricing management
DROP POLICY IF EXISTS "Marketing managers can manage promo codes" ON promo_codes;

-- Marketing managers can view all promo codes
CREATE POLICY "Marketing managers can view promo codes" 
  ON promo_codes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('marketing_manager', 'admin')
    )
  );

-- Marketing managers can create promo codes
CREATE POLICY "Marketing managers can create promo codes" 
  ON promo_codes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('marketing_manager', 'admin')
    )
  );

-- Marketing managers can update promo codes
CREATE POLICY "Marketing managers can update promo codes" 
  ON promo_codes FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('marketing_manager', 'admin')
    )
  );

-- Marketing managers can delete promo codes (admin only for hard delete)
CREATE POLICY "Admins can delete promo codes" 
  ON promo_codes FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Enhanced RLS for product_regional_pricing
ALTER TABLE product_regional_pricing ENABLE ROW LEVEL SECURITY;

-- Everyone can view active pricing
CREATE POLICY "Active pricing is viewable by everyone" 
  ON product_regional_pricing FOR SELECT 
  USING (true);

-- Marketing managers can manage pricing
CREATE POLICY "Marketing managers can manage pricing" 
  ON product_regional_pricing FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('marketing_manager', 'admin')
    )
  );

-- Function to set regional price
CREATE OR REPLACE FUNCTION set_regional_price(
  p_product_id UUID,
  p_region_id UUID,
  p_price NUMERIC,
  p_sale_price NUMERIC DEFAULT NULL,
  p_sale_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_sale_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('marketing_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only marketing managers can set regional prices';
  END IF;
  
  -- Upsert regional pricing
  INSERT INTO product_regional_pricing (
    product_id,
    region_id,
    price,
    sale_price,
    sale_start_date,
    sale_end_date,
    last_modified_by
  ) VALUES (
    p_product_id,
    p_region_id,
    p_price,
    p_sale_price,
    p_sale_start_date,
    p_sale_end_date,
    v_user_id
  )
  ON CONFLICT (product_id, region_id) 
  DO UPDATE SET
    price = EXCLUDED.price,
    sale_price = EXCLUDED.sale_price,
    sale_start_date = EXCLUDED.sale_start_date,
    sale_end_date = EXCLUDED.sale_end_date,
    last_modified_by = EXCLUDED.last_modified_by,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule sale pricing
CREATE OR REPLACE FUNCTION schedule_sale(
  p_product_id UUID,
  p_region_id UUID,
  p_sale_price NUMERIC,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('marketing_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only marketing managers can schedule sales';
  END IF;
  
  -- Validate dates
  IF p_start_date >= p_end_date THEN
    RAISE EXCEPTION 'Sale start date must be before end date';
  END IF;
  
  -- Update regional pricing with sale schedule
  UPDATE product_regional_pricing
  SET sale_price = p_sale_price,
      sale_start_date = p_start_date,
      sale_end_date = p_end_date,
      last_modified_by = v_user_id,
      updated_at = NOW()
  WHERE product_id = p_product_id AND region_id = p_region_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regional pricing not found for product and region';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable promo code
CREATE OR REPLACE FUNCTION disable_promo_code(
  p_promo_code_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('marketing_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only marketing managers can disable promo codes';
  END IF;
  
  -- Disable promo code
  UPDATE promo_codes
  SET is_active = false,
      disabled_at = NOW(),
      disabled_by = v_user_id,
      last_modified_by = v_user_id,
      updated_at = NOW()
  WHERE id = p_promo_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enable promo code
CREATE OR REPLACE FUNCTION enable_promo_code(
  p_promo_code_id UUID
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('marketing_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only marketing managers can enable promo codes';
  END IF;
  
  -- Enable promo code
  UPDATE promo_codes
  SET is_active = true,
      disabled_at = NULL,
      disabled_by = NULL,
      last_modified_by = v_user_id,
      updated_at = NOW()
  WHERE id = p_promo_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active sale price
CREATE OR REPLACE FUNCTION get_active_sale_price(
  p_product_id UUID,
  p_region_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_sale_price NUMERIC;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT sale_price, sale_start_date, sale_end_date
  INTO v_sale_price, v_start_date, v_end_date
  FROM product_regional_pricing
  WHERE product_id = p_product_id AND region_id = p_region_id;
  
  -- Check if sale is currently active
  IF v_sale_price IS NOT NULL AND
     (v_start_date IS NULL OR v_start_date <= NOW()) AND
     (v_end_date IS NULL OR v_end_date >= NOW()) THEN
    RETURN v_sale_price;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- View for promo code usage statistics
CREATE OR REPLACE VIEW promo_code_stats AS
SELECT 
  pc.id,
  pc.code,
  pc.discount_type,
  pc.discount_value,
  pc.is_active,
  pc.valid_from,
  pc.valid_until,
  pc.usage_limit_global as usage_limit,
  COUNT(pcu.id) as total_uses,
  COALESCE(SUM(pcu.discount_amount), 0) as total_discount_given,
  COUNT(DISTINCT pcu.user_id) as unique_users,
  pc.created_at,
  pc.updated_at
FROM promo_codes pc
LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
GROUP BY pc.id;
