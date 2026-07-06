-- Add DHL shipment fields to orders table
-- Migration: 78_add_dhl_fields_to_orders.sql

-- Add DHL-specific columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhl_shipment_number VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhl_tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhl_label_pdf TEXT; -- Base64 encoded PDF
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhl_product_code VARCHAR(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhl_service_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_dhl_shipment_number ON orders(dhl_shipment_number);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON orders(shipped_at);

-- Add comment
COMMENT ON COLUMN orders.dhl_shipment_number IS 'DHL shipment tracking number';
COMMENT ON COLUMN orders.dhl_tracking_url IS 'DHL tracking URL for customer';
COMMENT ON COLUMN orders.dhl_label_pdf IS 'Base64 encoded shipping label PDF';
COMMENT ON COLUMN orders.dhl_product_code IS 'DHL product/service code (e.g., P for Express Worldwide)';
COMMENT ON COLUMN orders.dhl_service_name IS 'DHL service name (e.g., DHL Express Worldwide)';
COMMENT ON COLUMN orders.shipped_at IS 'Timestamp when order was marked as shipped';
