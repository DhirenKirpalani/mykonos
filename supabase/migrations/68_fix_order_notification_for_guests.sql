-- Fix order notification triggers to handle guest orders without user_id
-- Update send_order_confirmation_email to use customer_email for guest orders

CREATE OR REPLACE FUNCTION send_order_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user users%ROWTYPE;
  v_order orders%ROWTYPE;
  v_region regions%ROWTYPE;
  v_recipient_email TEXT;
  v_recipient_name TEXT;
  v_customer_first_name TEXT;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = NEW.id;
  
  -- Handle authenticated vs guest orders
  IF v_order.user_id IS NOT NULL THEN
    -- Authenticated user - get from users table
    SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
    v_recipient_email := v_user.email;
    v_recipient_name := v_user.first_name || ' ' || v_user.last_name;
    v_customer_first_name := v_user.first_name;
  ELSE
    -- Guest order - use customer_email and extract name from shipping address
    v_recipient_email := v_order.customer_email;
    v_customer_first_name := COALESCE(v_order.shipping_address->>'full_name', 'Customer');
    v_recipient_name := v_customer_first_name;
  END IF;
  
  -- Skip if no email available
  IF v_recipient_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get region for currency
  SELECT * INTO v_region FROM regions WHERE currency_code = v_order.currency_code LIMIT 1;
  
  -- Queue order confirmation email
  PERFORM queue_notification(
    v_order.user_id, -- Can be null for guest orders
    v_recipient_email,
    v_recipient_name,
    'order_confirmation',
    'order_confirmation',
    jsonb_build_object(
      'customer_name', v_customer_first_name,
      'order_number', v_order.order_number,
      'order_date', TO_CHAR(v_order.created_at, 'YYYY-MM-DD'),
      'total_amount', v_order.total_amount::TEXT,
      'currency_symbol', COALESCE(v_region.currency_symbol, '$'),
      'order_url', CASE 
        WHEN v_order.user_id IS NOT NULL THEN 'https://mykonos.com/account/orders/' || v_order.id
        ELSE 'https://mykonos.com/track-order'
      END,
      'tracking_url', 'https://mykonos.com/track-order'
    ),
    1, -- High priority
    NOW(),
    jsonb_build_object('order_id', v_order.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update send_order_shipped_email for guest orders
CREATE OR REPLACE FUNCTION send_order_shipped_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user users%ROWTYPE;
  v_order orders%ROWTYPE;
  v_tracking_url TEXT;
  v_recipient_email TEXT;
  v_recipient_name TEXT;
  v_customer_first_name TEXT;
BEGIN
  -- Only send if status changed to 'shipped'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'shipped' THEN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = NEW.id;
    
    -- Handle authenticated vs guest orders
    IF v_order.user_id IS NOT NULL THEN
      SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
      v_recipient_email := v_user.email;
      v_recipient_name := v_user.first_name || ' ' || v_user.last_name;
      v_customer_first_name := v_user.first_name;
    ELSE
      v_recipient_email := v_order.customer_email;
      v_customer_first_name := COALESCE(v_order.shipping_address->>'full_name', 'Customer');
      v_recipient_name := v_customer_first_name;
    END IF;
    
    -- Skip if no email available
    IF v_recipient_email IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get tracking URL
    v_tracking_url := get_tracking_url(v_order.id);
    
    -- Queue shipped email
    PERFORM queue_notification(
      v_order.user_id,
      v_recipient_email,
      v_recipient_name,
      'order_shipped',
      'order_shipped',
      jsonb_build_object(
        'customer_name', v_customer_first_name,
        'order_number', v_order.order_number,
        'carrier_name', COALESCE(v_order.carrier_code, 'Carrier'),
        'tracking_number', COALESCE(v_order.tracking_number, 'N/A'),
        'estimated_delivery', COALESCE(TO_CHAR(v_order.estimated_delivery_date, 'YYYY-MM-DD'), 'TBD'),
        'tracking_url', COALESCE(v_tracking_url, 'https://mykonos.com/account/orders/' || v_order.id)
      ),
      2, -- High priority
      NOW(),
      jsonb_build_object('order_id', v_order.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update send_order_delivered_email for guest orders
CREATE OR REPLACE FUNCTION send_order_delivered_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user users%ROWTYPE;
  v_order orders%ROWTYPE;
  v_recipient_email TEXT;
  v_recipient_name TEXT;
  v_customer_first_name TEXT;
BEGIN
  -- Only send if status changed to 'delivered'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = NEW.id;
    
    -- Handle authenticated vs guest orders
    IF v_order.user_id IS NOT NULL THEN
      SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
      v_recipient_email := v_user.email;
      v_recipient_name := v_user.first_name || ' ' || v_user.last_name;
      v_customer_first_name := v_user.first_name;
    ELSE
      v_recipient_email := v_order.customer_email;
      v_customer_first_name := COALESCE(v_order.shipping_address->>'full_name', 'Customer');
      v_recipient_name := v_customer_first_name;
    END IF;
    
    -- Skip if no email available
    IF v_recipient_email IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Queue delivered email
    PERFORM queue_notification(
      v_order.user_id,
      v_recipient_email,
      v_recipient_name,
      'order_delivered',
      'order_delivered',
      jsonb_build_object(
        'customer_name', v_customer_first_name,
        'order_number', v_order.order_number
      ),
      3, -- Medium priority
      NOW(),
      jsonb_build_object('order_id', v_order.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update send_payment_success_email for guest orders
CREATE OR REPLACE FUNCTION send_payment_success_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user users%ROWTYPE;
  v_order orders%ROWTYPE;
  v_region regions%ROWTYPE;
  v_recipient_email TEXT;
  v_recipient_name TEXT;
  v_customer_first_name TEXT;
BEGIN
  -- Only send if payment status changed to 'completed'
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed' THEN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = NEW.id;
    
    -- Handle authenticated vs guest orders
    IF v_order.user_id IS NOT NULL THEN
      SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
      v_recipient_email := v_user.email;
      v_recipient_name := v_user.first_name || ' ' || v_user.last_name;
      v_customer_first_name := v_user.first_name;
    ELSE
      v_recipient_email := v_order.customer_email;
      v_customer_first_name := COALESCE(v_order.shipping_address->>'full_name', 'Customer');
      v_recipient_name := v_customer_first_name;
    END IF;
    
    -- Skip if no email available
    IF v_recipient_email IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get region for currency
    SELECT * INTO v_region FROM regions WHERE currency_code = v_order.currency_code LIMIT 1;
    
    -- Queue payment success email
    PERFORM queue_notification(
      v_order.user_id,
      v_recipient_email,
      v_recipient_name,
      'payment_success',
      'payment_success',
      jsonb_build_object(
        'customer_name', v_customer_first_name,
        'order_number', v_order.order_number,
        'total_amount', v_order.total_amount::TEXT,
        'currency_symbol', COALESCE(v_region.currency_symbol, '$')
      ),
      1, -- High priority
      NOW(),
      jsonb_build_object('order_id', v_order.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
