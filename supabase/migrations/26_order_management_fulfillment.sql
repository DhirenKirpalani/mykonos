-- Order Management & Fulfillment
-- Support for order dashboard, status management, and shipping/tracking

-- Add fulfillment fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_by UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'; -- 'low', 'normal', 'high', 'urgent'

-- Order internal notes table for history
CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for order management
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_created ON order_notes(created_at DESC);

-- Add constraint for valid priority
ALTER TABLE orders ADD CONSTRAINT valid_priority 
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Row Level Security for order notes
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

-- Support agents and inventory managers can view order notes
CREATE POLICY "Staff can view order notes" 
  ON order_notes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('support_agent', 'inventory_manager', 'admin')
    )
  );

-- Inventory managers can add order notes
CREATE POLICY "Inventory managers can add order notes" 
  ON order_notes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('inventory_manager', 'admin')
    )
  );

-- Function to update order status with validation
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_order_number TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('inventory_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only inventory managers can update order status';
  END IF;
  
  -- Get current status and order number
  SELECT status, order_number INTO v_current_status, v_order_number
  FROM orders 
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Validate status transition
  IF v_current_status = 'cancelled' OR v_current_status = 'refunded' THEN
    RAISE EXCEPTION 'Cannot update status of cancelled or refunded orders';
  END IF;
  
  -- Update order status
  UPDATE orders 
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Add to order status history
  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, p_new_status, v_user_id);
  
  -- Add note if provided
  IF p_note IS NOT NULL THEN
    INSERT INTO order_notes (order_id, note, created_by)
    VALUES (p_order_id, p_note, v_user_id);
  END IF;
  
  -- Set packed_at timestamp if status is 'packed'
  IF p_new_status = 'packed' THEN
    UPDATE orders 
    SET packed_at = NOW(),
        packed_by = v_user_id
    WHERE id = p_order_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign shipping carrier and tracking
CREATE OR REPLACE FUNCTION assign_shipping(
  p_order_id UUID,
  p_carrier_code TEXT,
  p_tracking_number TEXT,
  p_notify_customer BOOLEAN DEFAULT true
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_order_number TEXT;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('inventory_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only inventory managers can assign shipping';
  END IF;
  
  -- Get order details
  SELECT o.order_number, u.email 
  INTO v_order_number, v_user_email
  FROM orders o
  JOIN users u ON u.id = o.user_id
  WHERE o.id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Update order with tracking info
  UPDATE orders 
  SET carrier_code = p_carrier_code,
      tracking_number = p_tracking_number,
      status = 'shipped',
      shipped_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Add tracking event
  INSERT INTO shipment_tracking_events (
    order_id,
    event_type,
    event_status,
    event_description,
    event_timestamp
  ) VALUES (
    p_order_id,
    'picked_up',
    'in_transit',
    'Package picked up by carrier',
    NOW()
  );
  
  -- Add to order status history
  INSERT INTO order_status_history (order_id, status, changed_by)
  VALUES (p_order_id, 'shipped', v_user_id);
  
  -- TODO: Send notification email to customer if p_notify_customer is true
  -- This would integrate with an email service
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for bulk status update
CREATE OR REPLACE FUNCTION bulk_update_order_status(
  p_order_ids UUID[],
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL
) RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('inventory_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only inventory managers can bulk update orders';
  END IF;
  
  -- Process each order
  FOREACH v_order_id IN ARRAY p_order_ids
  LOOP
    BEGIN
      -- Get order number
      SELECT o.order_number INTO v_order_number
      FROM orders o
      WHERE o.id = v_order_id;
      
      IF NOT FOUND THEN
        order_id := v_order_id;
        order_number := NULL;
        success := false;
        error_message := 'Order not found';
        RETURN NEXT;
        CONTINUE;
      END IF;
      
      -- Update status using the single order function
      PERFORM update_order_status(v_order_id, p_new_status, p_note);
      
      order_id := v_order_id;
      order_number := v_order_number;
      success := true;
      error_message := NULL;
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      order_id := v_order_id;
      order_number := v_order_number;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for bulk shipping assignment
CREATE OR REPLACE FUNCTION bulk_assign_shipping(
  p_shipments JSONB
) RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_shipment RECORD;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = v_user_id 
    AND role IN ('inventory_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only inventory managers can bulk assign shipping';
  END IF;
  
  -- Process each shipment
  FOR v_shipment IN 
    SELECT * FROM jsonb_to_recordset(p_shipments) 
    AS items(order_id UUID, carrier_code TEXT, tracking_number TEXT, notify_customer BOOLEAN)
  LOOP
    BEGIN
      -- Assign shipping using the single order function
      PERFORM assign_shipping(
        v_shipment.order_id,
        v_shipment.carrier_code,
        v_shipment.tracking_number,
        COALESCE(v_shipment.notify_customer, true)
      );
      
      order_id := v_shipment.order_id;
      SELECT o.order_number INTO order_number FROM orders o WHERE o.id = v_shipment.order_id;
      success := true;
      error_message := NULL;
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      order_id := v_shipment.order_id;
      SELECT o.order_number INTO order_number FROM orders o WHERE o.id = v_shipment.order_id;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for order dashboard
CREATE OR REPLACE VIEW order_dashboard AS
SELECT 
  o.id,
  o.order_number,
  o.user_id,
  u.first_name || ' ' || u.last_name as customer_name,
  u.email as customer_email,
  o.status,
  o.total_amount,
  sa.country as shipping_country,
  o.carrier_code,
  o.tracking_number,
  o.priority,
  o.assigned_to,
  o.created_at,
  o.shipped_at,
  o.delivered_at,
  COUNT(DISTINCT oi.id) as item_count,
  SUM(oi.quantity) as total_items
FROM orders o
JOIN users u ON u.id = o.user_id
LEFT JOIN shipping_addresses sa ON sa.id = o.shipping_address_id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, u.first_name, u.last_name, u.email, sa.country;
