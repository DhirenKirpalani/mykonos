-- Add guest_shipping_address column to checkout_sessions table
-- This allows storing shipping address data for anonymous/guest users who don't have a user_id

ALTER TABLE checkout_sessions 
ADD COLUMN IF NOT EXISTS guest_shipping_address JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN checkout_sessions.guest_shipping_address IS 'Stores shipping address data for guest/anonymous checkout sessions. Used when shipping_address_id is null.';
