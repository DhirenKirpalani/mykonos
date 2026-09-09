-- Add PayPal order ID column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_order_id text;

-- Update payment_gateway constraint to include 'paypal' if it exists
-- (The column is likely a text field without a constraint, but if there is one, this updates it)
DO $$
BEGIN
  -- Check if there's a check constraint on payment_gateway
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'orders' AND constraint_name = 'orders_payment_gateway_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_gateway_check;
    ALTER TABLE orders ADD CONSTRAINT orders_payment_gateway_check
      CHECK (payment_gateway IN ('midtrans', 'stripe', 'paypal'));
  END IF;
END $$;
