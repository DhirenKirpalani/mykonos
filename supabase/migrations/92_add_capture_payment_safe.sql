-- Migration: Add atomic capture_payment_safe function
-- Fixes two issues:
-- 1. Optimistic lock doesn't work via PostgREST — need FOR UPDATE lock
-- 2. Reservations never completed after payment capture

CREATE OR REPLACE FUNCTION capture_payment_safe(
  p_order_id UUID,
  p_payment_metadata JSONB DEFAULT NULL,
  p_captured_via TEXT DEFAULT 'client'
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_result JSONB;
BEGIN
  -- Lock the order row to prevent concurrent updates
  SELECT id, payment_status, status INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Idempotency check — if already paid, return success
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_paid', 'message', 'Order already paid');
  END IF;
  
  -- Update order to paid
  UPDATE orders
  SET 
    payment_status = 'paid',
    status = 'processing',
    paid_at = NOW(),
    payment_metadata = COALESCE(p_payment_metadata, payment_metadata),
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Complete the inventory reservation for this order
  UPDATE inventory_reservations
  SET 
    status = 'completed',
    released_at = NOW()
  WHERE order_id = p_order_id
    AND status = 'active';
  
  -- Clear cart for authenticated users
  IF v_order.status IS NOT NULL THEN
    DELETE FROM cart_items 
    WHERE user_id = (SELECT user_id FROM orders WHERE id = p_order_id);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'status', 'paid', 
    'order_id', p_order_id,
    'paid_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION capture_payment_safe IS 'Atomically captures payment: locks order, checks idempotency, updates status, completes reservation. Prevents double capture under concurrent access.';
