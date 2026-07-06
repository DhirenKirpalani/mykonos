-- Make shipping_address nullable in orders table
-- This allows orders to be created before shipping address is finalized

ALTER TABLE orders
ALTER COLUMN shipping_address DROP NOT NULL;

COMMENT ON COLUMN orders.shipping_address IS 'Shipping address (JSONB) - can be null for pending orders';
