-- Add foreign key constraint for shipping_method_id in orders table
-- This was missing from the original schema and causes issues with Supabase queries

-- Add the foreign key constraint
ALTER TABLE orders 
ADD CONSTRAINT orders_shipping_method_id_fkey 
FOREIGN KEY (shipping_method_id) 
REFERENCES shipping_methods(id) 
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_orders_shipping_method ON orders(shipping_method_id);

-- Add comment
COMMENT ON COLUMN orders.shipping_method_id IS 'Foreign key to shipping_methods table';
