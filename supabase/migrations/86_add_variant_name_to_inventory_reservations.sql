-- Add ALL missing fields to inventory_reservations table
-- These fields link reservations to orders and variants

ALTER TABLE inventory_reservations
ADD COLUMN IF NOT EXISTS variant_name TEXT,
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');

-- Add index for order_id lookups
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_id ON inventory_reservations(order_id);

COMMENT ON COLUMN inventory_reservations.variant_name IS 'Product variant name (e.g., 50ml, 100ml)';
COMMENT ON COLUMN inventory_reservations.order_id IS 'Reference to the order this reservation belongs to';
COMMENT ON COLUMN inventory_reservations.expires_at IS 'When this reservation expires (24 hours default)';
