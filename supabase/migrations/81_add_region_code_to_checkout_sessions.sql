-- Add missing fields to checkout_sessions table
-- These fields store customer information and region during checkout

ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS region_code TEXT,
ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
ADD COLUMN IF NOT EXISTS guest_shipping_address JSONB,
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Add comments for documentation
COMMENT ON COLUMN checkout_sessions.region_code IS 'Selected region/country code during checkout (e.g., ID, US, AE)';
COMMENT ON COLUMN checkout_sessions.customer_first_name IS 'Customer first name during checkout';
COMMENT ON COLUMN checkout_sessions.customer_last_name IS 'Customer last name during checkout';
COMMENT ON COLUMN checkout_sessions.guest_shipping_address IS 'Shipping address for guest users (JSONB)';
COMMENT ON COLUMN checkout_sessions.shipping_address IS 'Full shipping address data (JSONB)';
