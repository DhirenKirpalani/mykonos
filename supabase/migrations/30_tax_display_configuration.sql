-- Tax Display Configuration
-- Add configuration for tax-inclusive vs tax-exclusive pricing per region

-- Add tax display mode to regions table
ALTER TABLE regions ADD COLUMN IF NOT EXISTS tax_display_mode TEXT DEFAULT 'exclusive';
-- tax_display_mode: 'inclusive' (price includes tax) or 'exclusive' (tax added at checkout)

-- Add constraint to ensure valid values
ALTER TABLE regions ADD CONSTRAINT valid_tax_display_mode 
  CHECK (tax_display_mode IN ('inclusive', 'exclusive'));

-- Add comment for clarity
COMMENT ON COLUMN regions.tax_display_mode IS 
  'Determines how tax is displayed: inclusive (price includes tax) or exclusive (tax shown separately at checkout)';
