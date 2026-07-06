-- Add subtotal column to order_items table
-- This stores the line item total (price * quantity)

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);

COMMENT ON COLUMN order_items.subtotal IS 'Line item subtotal (price_at_purchase * quantity)';
