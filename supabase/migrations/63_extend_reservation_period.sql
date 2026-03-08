-- Extend inventory reservation period to 24 hours to match Midtrans payment period
-- This ensures items remain reserved while customers complete their payment

-- Update the default expiry time for new reservations
ALTER TABLE inventory_reservations 
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '24 hours');

-- Update existing active reservations to extend their expiry
UPDATE inventory_reservations
SET expires_at = reserved_at + INTERVAL '24 hours'
WHERE status = 'active' 
  AND expires_at < NOW() + INTERVAL '24 hours';
