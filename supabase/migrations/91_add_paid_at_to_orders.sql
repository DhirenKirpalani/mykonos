-- Migration: Add paid_at column to orders table
-- Bug fix: Code references paid_at in 8 places but column was never created
-- Affected files:
--   app/api/paypal/capture-order/route.ts
--   app/api/paypal/webhook/route.ts (2 places)
--   app/api/paypal/retry-capture/route.ts (2 places)
--   app/api/paypal/verify-payment/route.ts
--   app/api/stripe/webhook/route.ts
--   app/account/orders/[id]/page.tsx (TypeScript type)
-- Without this column, all payment capture updates silently fail,
-- leaving orders stuck in pending_payment status even after payment is captured.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Backfill paid_at for existing paid orders using updated_at as approximation
UPDATE orders
SET paid_at = updated_at
WHERE payment_status = 'paid' AND paid_at IS NULL;

-- Add index for querying orders by payment date (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at) WHERE paid_at IS NOT NULL;

COMMENT ON COLUMN orders.paid_at IS 'Timestamp when payment was captured/confirmed';
