-- Rename price column to price_usd for clarity
-- This migration handles the transition from 'price' to 'price_usd'

-- Add price_usd column if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_usd NUMERIC(10, 2);

-- Copy data from price to price_usd if price column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'price'
  ) THEN
    UPDATE products SET price_usd = price WHERE price_usd IS NULL;
    ALTER TABLE products DROP COLUMN price;
  END IF;
END $$;

-- Make price_usd NOT NULL after data migration
ALTER TABLE products ALTER COLUMN price_usd SET NOT NULL;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_products_price_usd ON products(price_usd);

COMMENT ON COLUMN products.price_usd IS 'Product price in USD';
COMMENT ON COLUMN products.price_idr IS 'Product price in Indonesian Rupiah';
