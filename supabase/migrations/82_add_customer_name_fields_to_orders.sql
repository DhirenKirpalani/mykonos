-- Add customer fields to orders table
-- These fields store customer information for both registered users and guests

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.customer_first_name IS 'Customer first name (for both registered users and guests)';
COMMENT ON COLUMN orders.customer_last_name IS 'Customer last name (for both registered users and guests)';
COMMENT ON COLUMN orders.customer_phone IS 'Customer phone number (for both registered users and guests)';
