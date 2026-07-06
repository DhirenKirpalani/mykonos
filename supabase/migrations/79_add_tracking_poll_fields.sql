-- Migration: Add tracking poll fields to orders table
-- This enables automated DHL tracking status polling

-- Add shipping_status column for tracking shipment lifecycle
-- Separate from general order status
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_status TEXT,
ADD COLUMN IF NOT EXISTS last_tracking_poll TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_events JSONB,
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Add constraint for shipping_status values
ALTER TABLE orders
ADD CONSTRAINT orders_shipping_status_check 
CHECK (shipping_status IS NULL OR shipping_status IN (
  'pending',
  'shipped',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
  'returned'
));

-- Add index for efficient polling queries
-- This helps find orders that need polling quickly
CREATE INDEX IF NOT EXISTS idx_orders_tracking_poll 
ON orders(shipping_status, last_tracking_poll) 
WHERE tracking_number IS NOT NULL;

-- Add index for tracking number lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number 
ON orders(tracking_number) 
WHERE tracking_number IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN orders.shipping_status IS 'Current shipping/delivery status (separate from order status)';
COMMENT ON COLUMN orders.last_tracking_poll IS 'Last time DHL tracking was polled for this order';
COMMENT ON COLUMN orders.tracking_events IS 'Array of tracking events from DHL API';
COMMENT ON COLUMN orders.estimated_delivery_date IS 'Estimated delivery date from DHL';
COMMENT ON COLUMN orders.tracking_number IS 'DHL tracking number for this shipment';
