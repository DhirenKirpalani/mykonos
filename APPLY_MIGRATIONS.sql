-- ============================================
-- APPLY ALL MISSING COLUMN MIGRATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- Migration 81: Add missing fields to checkout_sessions
ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS region_code TEXT,
ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
ADD COLUMN IF NOT EXISTS guest_shipping_address JSONB,
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

COMMENT ON COLUMN checkout_sessions.region_code IS 'Selected region/country code during checkout (e.g., ID, US, AE)';
COMMENT ON COLUMN checkout_sessions.customer_first_name IS 'Customer first name during checkout';
COMMENT ON COLUMN checkout_sessions.customer_last_name IS 'Customer last name during checkout';
COMMENT ON COLUMN checkout_sessions.guest_shipping_address IS 'Shipping address for guest users (JSONB)';
COMMENT ON COLUMN checkout_sessions.shipping_address IS 'Full shipping address data (JSONB)';

-- Migration 82: Add customer fields to orders (redundant with 83, but safe with IF NOT EXISTS)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Migration 83: Add ALL missing order fields
ALTER TABLE orders
-- Customer information
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

-- Migration 84: Make shipping_address nullable
ALTER TABLE orders
ALTER COLUMN shipping_address DROP NOT NULL;

COMMENT ON COLUMN orders.shipping_address IS 'Shipping address (JSONB) - can be null for pending orders';

-- Migration 85: Add subtotal to order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);

COMMENT ON COLUMN order_items.subtotal IS 'Line item subtotal (price_at_purchase * quantity)';

-- Migration 86: Add ALL missing fields to inventory_reservations
ALTER TABLE inventory_reservations
ADD COLUMN IF NOT EXISTS variant_name TEXT,
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_id ON inventory_reservations(order_id);

COMMENT ON COLUMN inventory_reservations.variant_name IS 'Product variant name (e.g., 50ml, 100ml)';
COMMENT ON COLUMN inventory_reservations.order_id IS 'Reference to the order this reservation belongs to';
COMMENT ON COLUMN inventory_reservations.expires_at IS 'When this reservation expires (24 hours default)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All migrations applied successfully!';
  RAISE NOTICE '✅ checkout_sessions: region_code, customer names, shipping_address added';
  RAISE NOTICE '✅ orders: customer fields, payment fields, pricing fields added';
  RAISE NOTICE '✅ orders.shipping_address is now nullable';
  RAISE NOTICE '✅ Indexes created';
  RAISE NOTICE '🎉 You can now create orders without errors!';
END $$;
