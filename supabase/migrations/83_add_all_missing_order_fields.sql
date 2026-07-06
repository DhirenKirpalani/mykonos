-- Add ALL missing fields to orders table
-- This migration adds all fields required by the create_order_before_payment function

ALTER TABLE orders
-- Customer information
ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,

-- Order identification
ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE,

-- Payment information
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS snap_token TEXT,
ADD COLUMN IF NOT EXISTS snap_redirect_url TEXT,
ADD COLUMN IF NOT EXISTS payment_metadata JSONB,
ADD COLUMN IF NOT EXISTS expiry_time TIMESTAMP WITH TIME ZONE,

-- Pricing breakdown
ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0,

-- Promo code
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- Add comments
COMMENT ON COLUMN orders.customer_first_name IS 'Customer first name';
COMMENT ON COLUMN orders.customer_last_name IS 'Customer last name';
COMMENT ON COLUMN orders.customer_phone IS 'Customer phone number';
COMMENT ON COLUMN orders.session_id IS 'Guest session ID (for non-authenticated users)';
COMMENT ON COLUMN orders.order_number IS 'Unique human-readable order number';
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, completed, failed, refunded';
COMMENT ON COLUMN orders.payment_method IS 'Payment method used';
COMMENT ON COLUMN orders.snap_token IS 'Midtrans Snap token';
COMMENT ON COLUMN orders.snap_redirect_url IS 'Midtrans Snap redirect URL';
COMMENT ON COLUMN orders.payment_metadata IS 'Additional payment metadata (currency, exchange rate, etc)';
COMMENT ON COLUMN orders.expiry_time IS 'Payment expiry time';
COMMENT ON COLUMN orders.subtotal_amount IS 'Subtotal before discounts and fees';
COMMENT ON COLUMN orders.discount_amount IS 'Total discount amount';
COMMENT ON COLUMN orders.shipping_amount IS 'Shipping cost';
COMMENT ON COLUMN orders.tax_amount IS 'Tax amount';
COMMENT ON COLUMN orders.promo_code_id IS 'Applied promo code';
