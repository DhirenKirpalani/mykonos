-- Checkout and Orders Schema
-- Support for checkout flow, shipping methods, payment processing, and order management

-- Enhance orders table with all required fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES shipping_addresses(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Shipping methods table
CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  carrier_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  base_cost NUMERIC(10, 2) NOT NULL,
  estimated_days_min INTEGER NOT NULL,
  estimated_days_max INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods by region
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL, -- 'card', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay'
  provider TEXT NOT NULL, -- 'stripe', 'paypal', etc.
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checkout sessions (temporary state storage)
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  current_step INTEGER DEFAULT 1,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address_id UUID REFERENCES shipping_addresses(id),
  shipping_method_id UUID REFERENCES shipping_methods(id),
  payment_method_type TEXT,
  promo_code_id UUID REFERENCES promo_codes(id),
  cart_snapshot JSONB,
  pricing_snapshot JSONB,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT checkout_sessions_user_or_session_check 
    CHECK (
      (user_id IS NOT NULL AND session_id IS NULL) OR 
      (user_id IS NULL AND session_id IS NOT NULL)
    )
);

-- Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_region ON shipping_methods(region_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_region ON payment_methods(region_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user ON checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_session ON checkout_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_expires ON checkout_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- Row Level Security
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shipping methods are viewable by everyone" 
  ON shipping_methods FOR SELECT 
  USING (is_active = true);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payment methods are viewable by everyone" 
  ON payment_methods FOR SELECT 
  USING (is_active = true);

ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own checkout sessions" 
  ON checkout_sessions FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert their own checkout sessions" 
  ON checkout_sessions FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id AND session_id IS NULL) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update their own checkout sessions" 
  ON checkout_sessions FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their order status history" 
  ON order_status_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_status_history.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE
  v_order_number TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Format: MYK-YYYYMMDD-XXXX (e.g., MYK-20260207-A3F9)
    v_order_number := 'MYK-' || 
                      TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = v_order_number) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create order from checkout session
CREATE OR REPLACE FUNCTION create_order_from_checkout(
  p_checkout_session_id UUID,
  p_payment_intent_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_session checkout_sessions%ROWTYPE;
  v_order_id UUID;
  v_order_number TEXT;
  v_cart_item RECORD;
BEGIN
  -- Get checkout session
  SELECT * INTO v_session FROM checkout_sessions WHERE id = p_checkout_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session not found';
  END IF;
  
  -- Generate order number
  v_order_number := generate_order_number();
  
  -- Create order
  INSERT INTO orders (
    user_id,
    order_number,
    status,
    shipping_address_id,
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
  SELECT
    v_session.user_id,
    v_order_number,
    'processing',
    v_session.shipping_address_id,
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

-- Function to handle payment failure
CREATE OR REPLACE FUNCTION handle_payment_failure(
  p_checkout_session_id UUID,
  p_error_message TEXT
) RETURNS void AS $$
BEGIN
  -- Update checkout session with error
  UPDATE checkout_sessions 
  SET updated_at = NOW()
  WHERE id = p_checkout_session_id;
  
  -- Cart remains intact for retry
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
