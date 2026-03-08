-- Add Midtrans-specific payment fields to orders table
-- Store Midtrans order ID, transaction ID, and detailed payment method information

-- Add Midtrans order ID (their internal order ID)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT;

-- Add Midtrans transaction ID
ALTER TABLE orders ADD COLUMN IF NOT EXISTS midtrans_transaction_id TEXT;

-- Add detailed payment method type (credit_card, gopay, shopeepay, etc.)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_type TEXT;

-- Add payment channel/bank for credit card payments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_channel TEXT;

-- Add card type (visa, mastercard, jcb, etc.) for credit card payments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_type TEXT;

-- Add last 4 digits of card for reference
ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_last4 TEXT;

-- Add payment metadata as JSONB for storing full Midtrans response
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_metadata JSONB;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_midtrans_order_id ON orders(midtrans_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_midtrans_transaction_id ON orders(midtrans_transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_type ON orders(payment_method_type);

-- Add comments for documentation
COMMENT ON COLUMN orders.midtrans_order_id IS 'Midtrans internal order ID';
COMMENT ON COLUMN orders.midtrans_transaction_id IS 'Midtrans transaction ID';
COMMENT ON COLUMN orders.payment_method_type IS 'Detailed payment method: credit_card, gopay, shopeepay, qris, bank_transfer, etc.';
COMMENT ON COLUMN orders.payment_channel IS 'Payment channel/bank: bca, mandiri, bni, etc.';
COMMENT ON COLUMN orders.card_type IS 'Card type for credit card payments: visa, mastercard, jcb, amex';
COMMENT ON COLUMN orders.card_last4 IS 'Last 4 digits of card number';
COMMENT ON COLUMN orders.payment_metadata IS 'Full Midtrans payment response data in JSON format';
