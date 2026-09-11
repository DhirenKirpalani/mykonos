-- Migration: Fix promo code validation race condition, cart merge data loss,
--            guest checkout promo codes, and PayPal gateway constraint
--
-- Issue 1: validate_promo_code reads usage_count without a lock, allowing
--          multiple concurrent users to pass the usage_limit_global check.
-- Fix: Add FOR UPDATE lock on the promo code row.
--
-- Issue 2: merge_guest_cart uses read-then-write without ON CONFLICT,
--          causing duplicate key errors and silent data loss when two
--          browser tabs log in simultaneously.
-- Fix: Use FOR UPDATE lock on existing cart item to prevent race.
--
-- Issue 3: promo_code_usage.user_id is NOT NULL, blocking guest checkouts
--          from using promo codes.
-- Fix: Make user_id nullable.
--
-- Issue 4: create_order_before_payment (migration 89) removed promo code
--          usage recording entirely. Promo codes were silently ignored.
-- Fix: Restore record_promo_code_usage call with atomic FOR UPDATE lock.
--
-- Issue 5: payment_gateway_check constraint didn't include 'paypal',
--          causing PayPal order creation to fail silently.
-- Fix: Drop and recreate constraint to include 'paypal'.

-- ════════════════════════════════════════════════════════════
-- FIX 1: validate_promo_code with FOR UPDATE lock
-- ════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.validate_promo_code CASCADE;

CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_region_id UUID,
  p_cart_total NUMERIC,
  p_shipping_cost NUMERIC DEFAULT 0,
  p_product_ids UUID[] DEFAULT NULL
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
  -- Lock the promo code row to prevent concurrent validation race
  SELECT * INTO v_promo FROM promo_codes WHERE code = p_code AND is_active = true FOR UPDATE;
  
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
  
  -- Check global usage limit (now safe with FOR UPDATE lock)
  IF v_promo.usage_limit_global IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit_global THEN
    RETURN QUERY SELECT false, 'Promo code usage limit reached'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check per-user usage limit
  IF v_promo.usage_limit_per_user IS NOT NULL AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count 
    FROM promo_code_usage AS pcu
    WHERE pcu.promo_code_id = v_promo.id AND pcu.user_id = p_user_id;
    
    IF v_user_usage_count >= v_promo.usage_limit_per_user THEN
      RETURN QUERY SELECT false, 'You have already used this promo code'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check region restrictions
  IF EXISTS (SELECT 1 FROM promo_code_regions AS pcr WHERE pcr.promo_code_id = v_promo.id) THEN
    SELECT EXISTS (
      SELECT 1 FROM promo_code_regions AS pcr
      WHERE pcr.promo_code_id = v_promo.id AND pcr.region_id = p_region_id
    ) INTO v_region_allowed;
    
    IF NOT v_region_allowed THEN
      RETURN QUERY SELECT false, 'Promo code not available in your region'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check product scope restrictions if product_ids provided
  IF p_product_ids IS NOT NULL AND v_promo.scope = 'specific_products' THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM unnest(p_product_ids) pid 
      WHERE pid = ANY(v_promo.applicable_product_ids)
    ) THEN
      RETURN QUERY SELECT false, 'Promo code not applicable to these products'::TEXT, 0::NUMERIC, NULL::UUID, NULL::TEXT;
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

-- ════════════════════════════════════════════════════════════
-- FIX 1b: record_promo_code_usage with FOR UPDATE lock + limit check
-- This is the REAL fix — validation is just a preview, usage recording
-- is where the limit must be enforced atomically.
-- Also: allow NULL user_id for guest checkouts.
-- ════════════════════════════════════════════════════════════

-- Allow guest checkouts to use promo codes (user_id was NOT NULL)
ALTER TABLE promo_code_usage ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION record_promo_code_usage(
  p_promo_code_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_discount_amount NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_usage_count INTEGER;
BEGIN
  -- Lock the promo code row to prevent concurrent usage race
  SELECT * INTO v_promo FROM promo_codes WHERE id = p_promo_code_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promo code not found';
  END IF;

  -- Check global usage limit (atomic with FOR UPDATE lock)
  IF v_promo.usage_limit_global IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit_global THEN
    RAISE EXCEPTION 'Promo code usage limit reached';
  END IF;

  -- Check per-user usage limit (only for logged-in users)
  IF v_promo.usage_limit_per_user IS NOT NULL AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = p_promo_code_id AND user_id = p_user_id;

    IF v_user_usage_count >= v_promo.usage_limit_per_user THEN
      RAISE EXCEPTION 'You have already used this promo code the maximum number of times';
    END IF;
  END IF;

  -- Insert usage record (user_id can be NULL for guest checkouts)
  INSERT INTO promo_code_usage (promo_code_id, user_id, order_id, discount_amount)
  VALUES (p_promo_code_id, p_user_id, p_order_id, p_discount_amount);

  -- Increment usage count
  UPDATE promo_codes
  SET usage_count = usage_count + 1
  WHERE id = p_promo_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════
-- FIX 2: merge_guest_cart with FOR UPDATE lock
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION merge_guest_cart(
  p_session_id TEXT,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_cart_item RECORD;
  v_existing_id UUID;
BEGIN
  -- Loop through guest cart items
  FOR v_cart_item IN 
    SELECT * FROM cart_items WHERE session_id = p_session_id
  LOOP
    -- Lock existing cart item if present (FOR UPDATE prevents concurrent merge race)
    SELECT id INTO v_existing_id FROM cart_items
    WHERE user_id = p_user_id 
      AND product_id = v_cart_item.product_id
      AND COALESCE(variant_sku, '') = COALESCE(v_cart_item.variant_sku, '')
    FOR UPDATE;
    
    IF v_existing_id IS NOT NULL THEN
      -- Update quantity on existing item
      UPDATE cart_items 
      SET quantity = quantity + v_cart_item.quantity,
          updated_at = NOW()
      WHERE id = v_existing_id;
    ELSE
      -- Insert new item
      INSERT INTO cart_items (user_id, product_id, quantity, price_at_add, variant_name, variant_sku, created_at, updated_at)
      VALUES (
        p_user_id, 
        v_cart_item.product_id, 
        v_cart_item.quantity, 
        v_cart_item.price_at_add,
        v_cart_item.variant_name,
        v_cart_item.variant_sku,
        v_cart_item.created_at, 
        NOW()
      );
    END IF;
  END LOOP;
  
  -- Delete guest cart items
  DELETE FROM cart_items WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_promo_code IS 'Validates promo code with FOR UPDATE lock to prevent concurrent usage race conditions';
COMMENT ON FUNCTION merge_guest_cart IS 'Merges guest cart into user cart with FOR UPDATE to prevent duplicate key errors and data loss';

-- ════════════════════════════════════════════════════════════
-- FIX 3: create_order_before_payment — add promo code usage recording
-- The latest version (migration 89) removed promo code usage tracking
-- entirely. This restores it using the atomic record_promo_code_usage RPC.
-- ════════════════════════════════════════════════════════════

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
  v_cart_item RECORD;
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
    ELSE 'Rp'
  END;

  -- Get exchange rate from pricing_snapshot
  v_exchange_rate := NULL;
  IF v_session.pricing_snapshot IS NOT NULL AND v_session.pricing_snapshot ? 'exchange_rate_to_usd' THEN
    v_exchange_rate := (v_session.pricing_snapshot->>'exchange_rate_to_usd')::NUMERIC;
  END IF;

  -- Generate order number: MYK-YYYYMMDD-XXXX
  v_order_number := 'MYK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  -- Create order with pending_payment status
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
    'pending_payment',
    'pending',
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

  -- Lock all product rows BEFORE inserting order items.
  -- This prevents FK lock (FOR KEY SHARE) conflicts with the FOR UPDATE
  -- lock in reserve_inventory_for_order, which caused deadlocks under
  -- concurrent checkout (20 users → 8 deadlocks).
  FOR v_cart_item IN
    SELECT (item->>'product_id')::UUID AS product_id
    FROM jsonb_array_elements(v_session.cart_snapshot) AS item
  LOOP
    PERFORM 1 FROM products WHERE id = v_cart_item.product_id FOR UPDATE;
  END LOOP;

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

  -- Record promo code usage atomically (FIX: was missing entirely in migration 89)
  IF v_session.promo_code_id IS NOT NULL THEN
    PERFORM record_promo_code_usage(
      v_session.promo_code_id,
      v_session.user_id,
      v_order_id,
      (v_session.pricing_snapshot->>'discount')::NUMERIC
    );
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_order_before_payment IS 'Creates an order with pending payment status, records promo usage atomically, and stores currency metadata';

-- ════════════════════════════════════════════════════════════
-- FIX 4: payment_gateway_check constraint — add 'paypal'
-- The live database constraint didn't include 'paypal', causing
-- PayPal order creation to fail silently.
-- ════════════════════════════════════════════════════════════

ALTER TABLE orders DROP CONSTRAINT IF EXISTS payment_gateway_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_gateway_check;
ALTER TABLE orders ADD CONSTRAINT payment_gateway_check
  CHECK (payment_gateway IN ('midtrans', 'stripe', 'paypal'));

-- ════════════════════════════════════════════════════════════
-- FIX 5: auto_cancel_expired_orders — remove cancelled_at reference
-- The function references a cancelled_at column that doesn't exist
-- in the orders table, causing the cron to fail entirely.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_cancel_expired_orders()
RETURNS TABLE(expired_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_order RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_expired_order IN
    SELECT id, order_number
    FROM orders
    WHERE payment_status = 'pending'
      AND expiry_time IS NOT NULL
      AND expiry_time < NOW()
      AND status = 'pending_payment'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Update both payment_status AND status
    UPDATE orders
    SET
      payment_status = 'expired',
      status = 'cancelled',
      updated_at = NOW()
    WHERE id = v_expired_order.id;

    -- Release inventory reservations
    PERFORM release_inventory_reservations(v_expired_order.id);

    -- Add to status history
    INSERT INTO order_status_history (order_id, status, notes)
    VALUES (v_expired_order.id, 'cancelled', 'Auto-cancelled due to payment timeout');

    v_count := v_count + 1;
    RAISE NOTICE 'Auto-expired and cancelled order: %', v_expired_order.order_number;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- FIX 6: reserve_inventory_for_order — fix deadlocks under concurrency
-- The function locked the product row (FOR UPDATE) then separately locked
-- all reservation rows (FOR UPDATE). Under concurrent load (20+ users
-- checking out the same product), PostgreSQL detected deadlocks because
-- transactions waited on each other's reservation row locks.
--
-- Fix: Lock ONLY the product row. The product row lock serializes all
-- access — counting existing reservations with a plain aggregate is safe
-- because no other transaction can insert a new reservation for this
-- product while we hold the product row lock.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reserve_inventory_for_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_stock INTEGER;
  v_reserved INTEGER;
  v_existing_reservation_count INTEGER;
BEGIN
  FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    -- Check if reservation already exists (idempotency check)
    SELECT COUNT(*) INTO v_existing_reservation_count
    FROM inventory_reservations
    WHERE order_id = p_order_id
      AND product_id = v_item.product_id
      AND status = 'active';

    -- Skip if reservation already exists
    IF v_existing_reservation_count > 0 THEN
      RAISE NOTICE 'Reservation already exists for order % and product %, skipping',
        p_order_id, v_item.product_id;
      CONTINUE;
    END IF;

    -- Lock ONLY the product row — this serializes all concurrent
    -- transactions for the same product, preventing deadlocks.
    SELECT stock_quantity INTO v_stock
    FROM products
    WHERE id = v_item.product_id
    FOR UPDATE;

    -- Count existing active reservations (no FOR UPDATE needed —
    -- product row lock prevents any new reservations from being inserted)
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
    FROM inventory_reservations
    WHERE product_id = v_item.product_id
      AND status = 'active';

    IF (v_stock - v_reserved) < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Reserved: %, Requested: %',
        v_item.product_id, v_stock, v_reserved, v_item.quantity;
    END IF;

    -- Insert new reservation
    INSERT INTO inventory_reservations (order_id, product_id, quantity)
    VALUES (p_order_id, v_item.product_id, v_item.quantity);
  END LOOP;
END;
$$;
