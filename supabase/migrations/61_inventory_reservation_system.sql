-- Inventory Reservation System
-- Reserves inventory during checkout to prevent overselling
-- Reservations expire after 24 hours to match Midtrans payment period

-- Create inventory reservations table
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT inventory_reservations_user_or_session_check 
    CHECK (
      (user_id IS NOT NULL AND session_id IS NULL) OR 
      (user_id IS NULL AND session_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product ON inventory_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_user ON inventory_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_session ON inventory_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_checkout ON inventory_reservations(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON inventory_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status ON inventory_reservations(status);

-- Function to get available stock (accounting for active reservations)
CREATE OR REPLACE FUNCTION get_available_stock(p_product_id UUID) 
RETURNS INTEGER AS $$
DECLARE
  v_physical_stock INTEGER;
  v_reserved_quantity INTEGER;
BEGIN
  -- Get physical stock
  SELECT stock_quantity INTO v_physical_stock
  FROM products
  WHERE id = p_product_id;
  
  -- Get total active reservations
  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_quantity
  FROM inventory_reservations
  WHERE product_id = p_product_id
    AND status = 'active'
    AND expires_at > NOW();
  
  RETURN GREATEST(0, v_physical_stock - v_reserved_quantity);
END;
$$ LANGUAGE plpgsql;

-- Function to reserve inventory for checkout
CREATE OR REPLACE FUNCTION reserve_inventory_for_checkout(
  p_checkout_session_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_cart_item RECORD;
  v_available_stock INTEGER;
  v_session checkout_sessions%ROWTYPE;
BEGIN
  -- Get checkout session
  SELECT * INTO v_session FROM checkout_sessions WHERE id = p_checkout_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session not found';
  END IF;
  
  -- Cancel any existing reservations for this checkout session
  UPDATE inventory_reservations
  SET status = 'cancelled'
  WHERE checkout_session_id = p_checkout_session_id
    AND status = 'active';
  
  -- Get cart items
  FOR v_cart_item IN 
    SELECT ci.product_id, ci.quantity
    FROM cart_items ci
    WHERE (p_user_id IS NOT NULL AND ci.user_id = p_user_id)
       OR (p_session_id IS NOT NULL AND ci.session_id = p_session_id)
  LOOP
    -- Check available stock
    v_available_stock := get_available_stock(v_cart_item.product_id);
    
    IF v_available_stock < v_cart_item.quantity THEN
      -- Not enough stock, rollback
      RAISE EXCEPTION 'Insufficient stock for product %', v_cart_item.product_id;
    END IF;
    
    -- Create reservation
    INSERT INTO inventory_reservations (
      product_id,
      user_id,
      session_id,
      checkout_session_id,
      quantity,
      expires_at
    ) VALUES (
      v_cart_item.product_id,
      p_user_id,
      p_session_id,
      p_checkout_session_id,
      v_cart_item.quantity,
      NOW() + INTERVAL '15 minutes'
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to extend reservation expiration
CREATE OR REPLACE FUNCTION extend_reservation(
  p_checkout_session_id UUID,
  p_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE inventory_reservations
  SET expires_at = NOW() + (p_minutes || ' minutes')::INTERVAL
  WHERE checkout_session_id = p_checkout_session_id
    AND status = 'active';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to complete reservations (called when order is placed)
CREATE OR REPLACE FUNCTION complete_reservations(
  p_checkout_session_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE inventory_reservations
  SET status = 'completed'
  WHERE checkout_session_id = p_checkout_session_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to cancel reservations
CREATE OR REPLACE FUNCTION cancel_reservations(
  p_checkout_session_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE inventory_reservations
  SET status = 'cancelled'
  WHERE checkout_session_id = p_checkout_session_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to expire old reservations (run periodically)
CREATE OR REPLACE FUNCTION expire_old_reservations() 
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE inventory_reservations
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Update create_order_from_checkout to complete reservations
CREATE OR REPLACE FUNCTION create_order_from_checkout(
  p_checkout_session_id UUID,
  p_payment_intent_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_session checkout_sessions%ROWTYPE;
  v_order_id UUID;
  v_order_number TEXT;
  v_cart_item RECORD;
  v_shipping_address JSONB;
BEGIN
  -- Get checkout session
  SELECT * INTO v_session FROM checkout_sessions WHERE id = p_checkout_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session not found';
  END IF;
  
  -- Get shipping address as JSONB
  IF v_session.shipping_address_id IS NOT NULL THEN
    SELECT to_jsonb(shipping_addresses.*) INTO v_shipping_address
    FROM shipping_addresses
    WHERE id = v_session.shipping_address_id;
  ELSE
    RAISE EXCEPTION 'Shipping address is required';
  END IF;
  
  -- Generate order number
  v_order_number := generate_order_number();
  
  -- Create order
  INSERT INTO orders (
    user_id,
    order_number,
    status,
    shipping_address,
    shipping_method_id,
    payment_method,
    payment_status,
    payment_intent_id,
    subtotal,
    discount_amount,
    promo_code_id,
    shipping_cost,
    tax_amount,
    total_amount,
    currency_code,
    is_locked,
    completed_at
  )
  VALUES (
    v_session.user_id,
    v_order_number,
    'processing',
    v_shipping_address,
    v_session.shipping_method_id,
    v_session.payment_method_type,
    'completed',
    p_payment_intent_id,
    (v_session.pricing_snapshot->>'subtotal')::NUMERIC,
    (v_session.pricing_snapshot->>'discount')::NUMERIC,
    v_session.promo_code_id,
    (v_session.pricing_snapshot->>'shipping')::NUMERIC,
    (v_session.pricing_snapshot->>'tax')::NUMERIC,
    (v_session.pricing_snapshot->>'total')::NUMERIC,
    v_session.pricing_snapshot->>'currency_code',
    true,
    NOW()
  )
  RETURNING id INTO v_order_id;
  
  -- Create order items from cart snapshot
  FOR v_cart_item IN 
    SELECT * FROM jsonb_to_recordset(v_session.cart_snapshot) 
    AS items(product_id UUID, quantity INTEGER, price NUMERIC)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
    VALUES (v_order_id, v_cart_item.product_id, v_cart_item.quantity, v_cart_item.price);
    
    -- Reduce inventory
    UPDATE products 
    SET stock_quantity = stock_quantity - v_cart_item.quantity
    WHERE id = v_cart_item.product_id;
  END LOOP;
  
  -- Complete reservations
  PERFORM complete_reservations(p_checkout_session_id);
  
  -- Record promo code usage if applicable
  IF v_session.promo_code_id IS NOT NULL THEN
    PERFORM record_promo_code_usage(
      v_session.promo_code_id,
      v_session.user_id,
      v_order_id,
      (v_session.pricing_snapshot->>'discount')::NUMERIC
    );
  END IF;
  
  -- Add initial status history
  INSERT INTO order_status_history (order_id, status, notes)
  VALUES (v_order_id, 'processing', 'Order created and payment confirmed');
  
  -- Clear user's cart
  IF v_session.user_id IS NOT NULL THEN
    DELETE FROM cart_items WHERE user_id = v_session.user_id;
  ELSE
    DELETE FROM cart_items WHERE session_id = v_session.session_id;
  END IF;
  
  -- Delete checkout session
  DELETE FROM checkout_sessions WHERE id = p_checkout_session_id;
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reservations" ON inventory_reservations;
CREATE POLICY "Users can view their own reservations" 
  ON inventory_reservations FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- Admin policy for viewing all reservations
CREATE POLICY "Admins can view all reservations" 
  ON inventory_reservations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );
