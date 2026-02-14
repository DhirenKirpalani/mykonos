-- Order Notification Triggers
-- Automatically queue email notifications for order events

-- Function to send order confirmation email
CREATE OR REPLACE FUNCTION send_order_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user users%ROWTYPE;
  v_order orders%ROWTYPE;
  v_shipping_address shipping_addresses%ROWTYPE;
  v_region regions%ROWTYPE;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = NEW.id;
  
  -- Get user details
  SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
  
  -- Get shipping address
  SELECT * INTO v_shipping_address FROM shipping_addresses WHERE id = v_order.shipping_address_id;
  
  -- Get region for currency
  SELECT * INTO v_region FROM regions WHERE currency_code = v_order.currency_code LIMIT 1;
  
  -- Queue order confirmation email
  PERFORM queue_notification(
    v_user.id,
    v_user.email,
    v_user.first_name || ' ' || v_user.last_name,
    'order_confirmation',
    'order_confirmation',
    jsonb_build_object(
      'customer_name', v_user.first_name,
      'order_number', v_order.order_number,
      'order_date', TO_CHAR(v_order.created_at, 'YYYY-MM-DD'),
      'total_amount', v_order.total_amount::TEXT,
      'currency_symbol', COALESCE(v_region.currency_symbol, '$'),
      'order_url', 'https://mykonos.com/account/orders/' || v_order.id
    ),
    1, -- High priority
    NOW(),
    jsonb_build_object('order_id', v_order.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for order confirmation
DROP TRIGGER IF EXISTS on_order_created ON orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'processing' AND NEW.payment_status = 'completed')
  EXECUTE FUNCTION send_order_confirmation_email();

-- Function to send order shipped email
CREATE OR REPLACE FUNCTION send_order_shipped_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user users%ROWTYPE;
  v_order orders%ROWTYPE;
  v_tracking_url TEXT;
BEGIN
  -- Only send if status changed to 'shipped'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'shipped' THEN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = NEW.id;
    
    -- Get user details
    SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
    
    -- Get tracking URL
    v_tracking_url := get_tracking_url(v_order.id);
    
    -- Queue shipped email
    PERFORM queue_notification(
      v_user.id,
      v_user.email,
      v_user.first_name || ' ' || v_user.last_name,
      'order_shipped',
      'order_shipped',
      jsonb_build_object(
        'customer_name', v_user.first_name,
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

-- Trigger for order shipped
DROP TRIGGER IF EXISTS on_order_shipped ON orders;
CREATE TRIGGER on_order_shipped
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'shipped')
  EXECUTE FUNCTION send_order_shipped_email();

-- Function to send order delivered email
CREATE OR REPLACE FUNCTION send_order_delivered_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user users%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  -- Only send if status changed to 'delivered'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = NEW.id;
    
    -- Get user details
    SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
    
    -- Queue delivered email
    PERFORM queue_notification(
      v_user.id,
      v_user.email,
      v_user.first_name || ' ' || v_user.last_name,
      'order_delivered',
      'order_delivered',
      jsonb_build_object(
        'customer_name', v_user.first_name,
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

-- Trigger for order delivered
DROP TRIGGER IF EXISTS on_order_delivered ON orders;
CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered')
  EXECUTE FUNCTION send_order_delivered_email();

-- Function to send payment success email
CREATE OR REPLACE FUNCTION send_payment_success_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user users%ROWTYPE;
  v_order orders%ROWTYPE;
  v_region regions%ROWTYPE;
BEGIN
  -- Only send if payment status changed to 'completed'
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed' THEN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = NEW.id;
    
    -- Get user details
    SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
    
    -- Get region for currency
    SELECT * INTO v_region FROM regions WHERE currency_code = v_order.currency_code LIMIT 1;
    
    -- Queue payment success email
    PERFORM queue_notification(
      v_user.id,
      v_user.email,
      v_user.first_name || ' ' || v_user.last_name,
      'payment_success',
      'payment_success',
      jsonb_build_object(
        'customer_name', v_user.first_name,
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

-- Trigger for payment success
DROP TRIGGER IF EXISTS on_payment_success ON orders;
CREATE TRIGGER on_payment_success
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed')
  EXECUTE FUNCTION send_payment_success_email();

-- Comments
COMMENT ON FUNCTION send_order_confirmation_email() IS 'Automatically queues order confirmation email when order is created';
COMMENT ON FUNCTION send_order_shipped_email() IS 'Automatically queues shipping notification when order status changes to shipped';
COMMENT ON FUNCTION send_order_delivered_email() IS 'Automatically queues delivery confirmation when order is delivered';
COMMENT ON FUNCTION send_payment_success_email() IS 'Automatically queues payment success email when payment is completed';
