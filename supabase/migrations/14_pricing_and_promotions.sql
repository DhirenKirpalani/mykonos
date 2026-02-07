-- Pricing and Promotions Schema
-- Support for regional pricing, sale pricing, and promo codes

-- Enhance product_regional_pricing with pricing type
ALTER TABLE product_regional_pricing ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'standard';
-- pricing_type: 'local' or 'international'

-- Promo codes table
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
  discount_value NUMERIC(10, 2) NOT NULL,
  min_purchase_amount NUMERIC(10, 2),
  max_discount_amount NUMERIC(10, 2),
  usage_limit_global INTEGER,
  usage_limit_per_user INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed')),
  CONSTRAINT valid_discount_value CHECK (discount_value > 0),
  CONSTRAINT valid_percentage CHECK (discount_type != 'percentage' OR discount_value <= 100)
);

-- Promo code region restrictions
CREATE TABLE promo_code_regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(promo_code_id, region_id)
);

-- Promo code usage tracking
CREATE TABLE promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(promo_code_id, order_id)
);

-- Indexes
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX idx_promo_codes_validity ON promo_codes(valid_from, valid_until);
CREATE INDEX idx_promo_code_regions_promo ON promo_code_regions(promo_code_id);
CREATE INDEX idx_promo_code_regions_region ON promo_code_regions(region_id);
CREATE INDEX idx_promo_code_usage_promo ON promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_code_usage_user ON promo_code_usage(user_id);
CREATE INDEX idx_promo_code_usage_order ON promo_code_usage(order_id);

-- Row Level Security (RLS)
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promo codes are viewable by everyone" 
  ON promo_codes FOR SELECT 
  USING (is_active = true);

ALTER TABLE promo_code_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promo code regions are viewable by everyone" 
  ON promo_code_regions FOR SELECT 
  USING (true);

ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own promo code usage" 
  ON promo_code_usage FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own promo code usage" 
  ON promo_code_usage FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Function to validate and apply promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_region_id UUID,
  p_cart_total NUMERIC
) RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  discount_amount NUMERIC,
  promo_code_id UUID
) AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_usage_count INTEGER;
  v_region_allowed BOOLEAN;
  v_discount NUMERIC;
BEGIN
  -- Get promo code
  SELECT * INTO v_promo FROM promo_codes WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid promo code'::TEXT, 0::NUMERIC, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check validity dates
  IF v_promo.valid_from IS NOT NULL AND NOW() < v_promo.valid_from THEN
    RETURN QUERY SELECT false, 'Promo code not yet valid'::TEXT, 0::NUMERIC, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_promo.valid_until IS NOT NULL AND NOW() > v_promo.valid_until THEN
    RETURN QUERY SELECT false, 'Promo code has expired'::TEXT, 0::NUMERIC, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check global usage limit
  IF v_promo.usage_limit_global IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit_global THEN
    RETURN QUERY SELECT false, 'Promo code usage limit reached'::TEXT, 0::NUMERIC, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check per-user usage limit
  IF v_promo.usage_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count 
    FROM promo_code_usage 
    WHERE promo_code_id = v_promo.id AND user_id = p_user_id;
    
    IF v_user_usage_count >= v_promo.usage_limit_per_user THEN
      RETURN QUERY SELECT false, 'You have already used this promo code'::TEXT, 0::NUMERIC, NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Check region restrictions
  IF EXISTS (SELECT 1 FROM promo_code_regions WHERE promo_code_id = v_promo.id) THEN
    SELECT EXISTS (
      SELECT 1 FROM promo_code_regions 
      WHERE promo_code_id = v_promo.id AND region_id = p_region_id
    ) INTO v_region_allowed;
    
    IF NOT v_region_allowed THEN
      RETURN QUERY SELECT false, 'Promo code not available in your region'::TEXT, 0::NUMERIC, NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Check minimum purchase amount
  IF v_promo.min_purchase_amount IS NOT NULL AND p_cart_total < v_promo.min_purchase_amount THEN
    RETURN QUERY SELECT false, 
      format('Minimum purchase amount of %s required', v_promo.min_purchase_amount)::TEXT, 
      0::NUMERIC, 
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := p_cart_total * (v_promo.discount_value / 100);
  ELSE
    v_discount := v_promo.discount_value;
  END IF;
  
  -- Apply max discount cap
  IF v_promo.max_discount_amount IS NOT NULL AND v_discount > v_promo.max_discount_amount THEN
    v_discount := v_promo.max_discount_amount;
  END IF;
  
  -- Ensure discount doesn't exceed cart total
  IF v_discount > p_cart_total THEN
    v_discount := p_cart_total;
  END IF;
  
  RETURN QUERY SELECT true, NULL::TEXT, v_discount, v_promo.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record promo code usage
CREATE OR REPLACE FUNCTION record_promo_code_usage(
  p_promo_code_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_discount_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Insert usage record
  INSERT INTO promo_code_usage (promo_code_id, user_id, order_id, discount_amount)
  VALUES (p_promo_code_id, p_user_id, p_order_id, p_discount_amount);
  
  -- Increment usage count
  UPDATE promo_codes 
  SET usage_count = usage_count + 1 
  WHERE id = p_promo_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
