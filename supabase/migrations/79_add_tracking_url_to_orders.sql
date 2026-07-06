-- Add tracking_url column to orders table
-- This stores the DHL tracking URL for shipped orders

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Add comment
COMMENT ON COLUMN orders.tracking_url IS 'DHL tracking URL for the shipment';
