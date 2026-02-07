-- Order Tracking and Shipment Information
-- Support for shipment tracking and carrier links

-- Add tracking fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Shipment tracking events table
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception'
  event_status TEXT NOT NULL,
  event_description TEXT,
  location TEXT,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Carrier tracking URL templates
CREATE TABLE IF NOT EXISTS carrier_tracking_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_code TEXT UNIQUE NOT NULL,
  carrier_name TEXT NOT NULL,
  tracking_url_template TEXT NOT NULL, -- e.g., 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_events_order ON shipment_tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_events_timestamp ON shipment_tracking_events(event_timestamp DESC);

-- Row Level Security
ALTER TABLE shipment_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their shipment tracking events" 
  ON shipment_tracking_events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = shipment_tracking_events.order_id 
      AND orders.user_id = auth.uid()
    )
  );

ALTER TABLE carrier_tracking_urls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Carrier tracking URLs are viewable by everyone" 
  ON carrier_tracking_urls FOR SELECT 
  USING (is_active = true);

-- Function to get tracking URL for an order
CREATE OR REPLACE FUNCTION get_tracking_url(
  p_order_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_tracking_number TEXT;
  v_carrier_code TEXT;
  v_url_template TEXT;
  v_tracking_url TEXT;
BEGIN
  -- Get order tracking info
  SELECT tracking_number, carrier_code 
  INTO v_tracking_number, v_carrier_code
  FROM orders 
  WHERE id = p_order_id;
  
  IF v_tracking_number IS NULL OR v_carrier_code IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get carrier URL template
  SELECT tracking_url_template 
  INTO v_url_template
  FROM carrier_tracking_urls 
  WHERE carrier_code = v_carrier_code AND is_active = true;
  
  IF v_url_template IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Replace placeholder with tracking number
  v_tracking_url := REPLACE(v_url_template, '{tracking_number}', v_tracking_number);
  
  RETURN v_tracking_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add shipment tracking event
CREATE OR REPLACE FUNCTION add_tracking_event(
  p_order_id UUID,
  p_event_type TEXT,
  p_event_status TEXT,
  p_event_description TEXT,
  p_location TEXT DEFAULT NULL,
  p_event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insert tracking event
  INSERT INTO shipment_tracking_events (
    order_id,
    event_type,
    event_status,
    event_description,
    location,
    event_timestamp
  ) VALUES (
    p_order_id,
    p_event_type,
    p_event_status,
    p_event_description,
    p_location,
    p_event_timestamp
  ) RETURNING id INTO v_event_id;
  
  -- Update order status based on event type
  CASE p_event_type
    WHEN 'label_created' THEN
      UPDATE orders SET status = 'processing' WHERE id = p_order_id;
    WHEN 'picked_up' THEN
      UPDATE orders SET status = 'shipped', shipped_at = p_event_timestamp WHERE id = p_order_id;
    WHEN 'in_transit' THEN
      UPDATE orders SET status = 'shipped' WHERE id = p_order_id;
    WHEN 'out_for_delivery' THEN
      UPDATE orders SET status = 'out_for_delivery' WHERE id = p_order_id;
    WHEN 'delivered' THEN
      UPDATE orders SET status = 'delivered', delivered_at = p_event_timestamp WHERE id = p_order_id;
    WHEN 'exception' THEN
      UPDATE orders SET status = 'exception' WHERE id = p_order_id;
  END CASE;
  
  -- Add to status history
  INSERT INTO order_status_history (order_id, status, notes)
  VALUES (p_order_id, p_event_status, p_event_description);
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
