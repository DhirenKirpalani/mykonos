-- Migration: Fix order status consistency
-- Issue: Database uses 'pending' but UI expects 'pending_payment'
-- Solution: Standardize to 'pending_payment' for orders awaiting payment

-- Step 1: Update existing orders with 'pending' status to 'pending_payment'
UPDATE orders 
SET status = 'pending_payment' 
WHERE status = 'pending' 
  AND payment_status = 'pending';

-- Step 2: Update the create_order_before_payment function to use 'pending_payment'
CREATE OR REPLACE FUNCTION create_order_before_payment(
  p_checkout_session_id UUID,
  p_snap_token TEXT DEFAULT NULL,
  p_snap_redirect_url TEXT DEFAULT NULL,
  p_expiry_time TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_session RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_currency_code TEXT;
  v_currency_symbol TEXT;
  v_exchange_rate NUMERIC(10, 6);
BEGIN
  -- Get checkout session details
  SELECT * INTO v_session
  FROM checkout_sessions
  WHERE id = p_checkout_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session not found';
  END IF;

  -- Get currency code from pricing_snapshot, fallback to region
  v_currency_code := COALESCE(
    v_session.pricing_snapshot->>'currency_code',
    (SELECT currency_code FROM regions WHERE code = v_session.region_code LIMIT 1),
    'IDR'
  );

  -- Map currency code to symbol
  v_currency_symbol := CASE v_currency_code
    WHEN 'USD' THEN '$'
    WHEN 'EUR' THEN '€'
    WHEN 'GBP' THEN '£'
    WHEN 'IDR' THEN 'Rp'
    WHEN 'SGD' THEN 'S$'
    WHEN 'MYR' THEN 'RM'
    WHEN 'THB' THEN '฿'
    WHEN 'PHP' THEN '₱'
    WHEN 'VND' THEN '₫'
    WHEN 'AUD' THEN 'A$'
    WHEN 'NZD' THEN 'NZ$'
    WHEN 'CAD' THEN 'C$'
    WHEN 'JPY' THEN '¥'
    WHEN 'KRW' THEN '₩'
    WHEN 'CNY' THEN '¥'
    WHEN 'HKD' THEN 'HK$'
    WHEN 'TWD' THEN 'NT$'
    WHEN 'INR' THEN '₹'
    WHEN 'BRL' THEN 'R$'
    WHEN 'MXN' THEN 'Mex$'
    WHEN 'ARS' THEN 'AR$'
    WHEN 'CLP' THEN 'CL$'
    WHEN 'COP' THEN 'CO$'
    WHEN 'ZAR' THEN 'R'
    WHEN 'AED' THEN 'د.إ'
    WHEN 'SAR' THEN 'ر.س'
    WHEN 'TRY' THEN '₺'
    WHEN 'RUB' THEN '₽'
    WHEN 'PLN' THEN 'zł'
    WHEN 'SEK' THEN 'kr'
    WHEN 'NOK' THEN 'kr'
    WHEN 'DKK' THEN 'kr'
    WHEN 'CHF' THEN 'CHF'
    ELSE 'Rp' -- Default fallback
  END;

  -- Get exchange rate from pricing_snapshot
  v_exchange_rate := NULL;
  IF v_session.pricing_snapshot IS NOT NULL AND v_session.pricing_snapshot ? 'exchange_rate_to_usd' THEN
    v_exchange_rate := (v_session.pricing_snapshot->>'exchange_rate_to_usd')::NUMERIC;
  END IF;

  -- Generate order number: MYK-YYYYMMDD-XXXX
  v_order_number := 'MYK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  -- Create order with pending_payment status (FIXED: was 'pending')
  INSERT INTO orders (
    user_id,
    session_id,
    customer_email,
    customer_first_name,
    customer_last_name,
    customer_phone,
    shipping_address,
    order_number,
    status,
    payment_status,
    payment_method,
    snap_token,
    snap_redirect_url,
    subtotal_amount,
    discount_amount,
    promo_code_id,
    shipping_amount,
    tax_amount,
    total_amount,
    currency_code,
    payment_metadata,
    expiry_time,
    created_at
  ) VALUES (
    v_session.user_id,
    v_session.session_id,
    v_session.customer_email,
    v_session.customer_first_name,
    v_session.customer_last_name,
    v_session.customer_phone,
    COALESCE(v_session.guest_shipping_address, v_session.shipping_address),
    v_order_number,
    'pending_payment',  -- FIXED: Changed from 'pending' to 'pending_payment'
    'pending',          -- payment_status remains 'pending'
    v_session.payment_method_type,
    p_snap_token,
    p_snap_redirect_url,
    (v_session.pricing_snapshot->>'subtotal')::NUMERIC,
    (v_session.pricing_snapshot->>'discount')::NUMERIC,
    v_session.promo_code_id,
    (v_session.pricing_snapshot->>'shipping')::NUMERIC,
    (v_session.pricing_snapshot->>'tax')::NUMERIC,
    (v_session.pricing_snapshot->>'total')::NUMERIC,
    v_currency_code,
    jsonb_build_object(
      'currency_code', v_currency_code,
      'currency_symbol', v_currency_symbol,
      'exchange_rate_to_usd', v_exchange_rate
    ),
    COALESCE(p_expiry_time, NOW() + INTERVAL '24 hours'),
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- Create order items from cart snapshot
  INSERT INTO order_items (
    order_id,
    product_id,
    variant_name,
    variant_sku,
    quantity,
    price_at_purchase,
    subtotal
  )
  SELECT
    v_order_id,
    (item->>'product_id')::UUID,
    item->>'variant_name',
    item->>'variant_sku',
    (item->>'quantity')::INTEGER,
    (item->>'price')::NUMERIC,
    (item->>'price')::NUMERIC * (item->>'quantity')::INTEGER
  FROM jsonb_array_elements(v_session.cart_snapshot) AS item;

  -- Reserve inventory for this order
  PERFORM reserve_inventory_for_order(v_order_id);

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the status values
COMMENT ON COLUMN orders.status IS 'Order status: pending_payment (awaiting payment), processing (payment confirmed), packed, shipped, delivered, cancelled, refunded';
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, completed, failed, refunded, expired';
