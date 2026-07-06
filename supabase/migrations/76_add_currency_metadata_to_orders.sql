-- Migration: Add currency metadata to orders using payment_metadata
-- Store local currency information in existing JSONB column for proper display

-- Update payment_metadata comment to include currency info
COMMENT ON COLUMN orders.payment_metadata IS 'Payment and currency metadata in JSON format: {currency_code, currency_symbol, exchange_rate_to_usd, payment_channel, etc.}';

-- Update existing orders to have currency metadata in payment_metadata
-- Note: Exchange rates are NOT set for historical orders as they should reflect the rate at time of order
-- Only set currency_code and symbol for display purposes
UPDATE orders 
SET payment_metadata = COALESCE(payment_metadata, '{}'::jsonb) || 
  jsonb_build_object(
    'currency_code', 'USD',
    'currency_symbol', '$'
  )
WHERE payment_metadata IS NULL OR NOT (payment_metadata ? 'currency_code');

-- Update existing IDR orders (detected by large total_amount)
UPDATE orders 
SET payment_metadata = COALESCE(payment_metadata, '{}'::jsonb) || 
  jsonb_build_object(
    'currency_code', 'IDR',
    'currency_symbol', 'Rp'
  )
WHERE total_amount > 100000 AND (payment_metadata IS NULL OR NOT (payment_metadata ? 'currency_code'));

-- Create index for faster currency-based queries using JSONB
CREATE INDEX IF NOT EXISTS idx_orders_currency_metadata ON orders USING gin(payment_metadata);
