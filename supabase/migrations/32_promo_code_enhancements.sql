-- Promo Code Enhancements
-- Add applicability scope to promo codes (products, shipping, or entire order)

-- Add applies_to field to promo_codes table
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS applies_to TEXT DEFAULT 'order';
-- applies_to: 'products' (discount on products only), 'shipping' (discount on shipping only), 'order' (discount on entire order)

-- Add constraint to ensure valid values
ALTER TABLE promo_codes ADD CONSTRAINT valid_applies_to 
  CHECK (applies_to IN ('products', 'shipping', 'order'));

-- Add comment for clarity
COMMENT ON COLUMN promo_codes.applies_to IS 
  'Determines what the promo code applies to: products (product subtotal only), shipping (shipping cost only), or order (entire order total)';

-- Update the validate_promo_code function to handle applicability scope
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_region_id UUID,
  p_cart_total NUMERIC,
  p_shipping_cost NUMERIC DEFAULT 0
) RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  discount_amount NUMERIC,
  promo_code_id UUID,
  applies_to TEXT
) AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_usage_count INTEGER;
  v_region_allowed BOOLEAN;
  v_discount NUMERIC;
  v_applicable_amount NUMERIC;
BEGIN
  -- Get promo code
  SELECT * INTO v_promo FROM promo_codes WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid promo code'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check validity dates
  IF v_promo.valid_from IS NOT NULL AND NOW() < v_promo.valid_from THEN
    RETURN QUERY SELECT false, 'Promo code not yet valid'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_promo.valid_until IS NOT NULL AND NOW() > v_promo.valid_until THEN
    RETURN QUERY SELECT false, 'Promo code has expired'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check global usage limit
  IF v_promo.usage_limit_global IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit_global THEN
    RETURN QUERY SELECT false, 'Promo code usage limit reached'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check per-user usage limit
  IF v_promo.usage_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count 
    FROM promo_code_usage 
    WHERE promo_code_id = v_promo.id AND user_id = p_user_id;
    
    IF v_user_usage_count >= v_promo.usage_limit_per_user THEN
      RETURN QUERY SELECT false, 'You have already used this promo code'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
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
      RETURN QUERY SELECT false, 'Promo code not available in your region'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Determine applicable amount based on scope
  CASE v_promo.applies_to
    WHEN 'products' THEN
      v_applicable_amount := p_cart_total;
    WHEN 'shipping' THEN
      v_applicable_amount := p_shipping_cost;
    WHEN 'order' THEN
      v_applicable_amount := p_cart_total + p_shipping_cost;
  END CASE;
  
  -- Check minimum purchase amount (only for 'products' and 'order' types)
  IF v_promo.applies_to IN ('products', 'order') THEN
    IF v_promo.min_purchase_amount IS NOT NULL AND p_cart_total < v_promo.min_purchase_amount THEN
      RETURN QUERY SELECT false, 
        format('Minimum purchase amount of %s required', v_promo.min_purchase_amount)::TEXT, 
        0::NUMERIC, 
        NULL::UUID,
        NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := v_applicable_amount * (v_promo.discount_value / 100);
  ELSE
    v_discount := v_promo.discount_value;
  END IF;
  
  -- Apply max discount cap
  IF v_promo.max_discount_amount IS NOT NULL AND v_discount > v_promo.max_discount_amount THEN
    v_discount := v_promo.max_discount_amount;
  END IF;
  
  -- Ensure discount doesn't exceed applicable amount
  IF v_discount > v_applicable_amount THEN
    v_discount := v_applicable_amount;
  END IF;
  
  RETURN QUERY SELECT true, NULL::TEXT, v_discount, v_promo.id, v_promo.applies_to;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
