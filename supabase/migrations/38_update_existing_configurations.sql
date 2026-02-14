-- Update Existing Configurations
-- Apply new fields and settings to existing data

-- Update regions with tax display mode
-- US: Tax exclusive (tax added at checkout)
UPDATE regions SET tax_display_mode = 'exclusive' WHERE code = 'US';

-- EU: Tax inclusive (price includes VAT)
UPDATE regions SET tax_display_mode = 'inclusive' WHERE code = 'EU';

-- UK: Tax inclusive (price includes VAT)
UPDATE regions SET tax_display_mode = 'inclusive' WHERE code = 'UK';

-- APAC: Tax exclusive (varies by country)
UPDATE regions SET tax_display_mode = 'exclusive' WHERE code = 'APAC';

-- MENA: Tax exclusive (varies by country)
UPDATE regions SET tax_display_mode = 'exclusive' WHERE code = 'MENA';

-- LATAM: Tax exclusive (varies by country)
UPDATE regions SET tax_display_mode = 'exclusive' WHERE code = 'LATAM';

-- Update promo codes with applies_to field (set all existing to 'order' by default)
UPDATE promo_codes SET applies_to = 'order' WHERE applies_to IS NULL;

-- Add comments for clarity on new features
COMMENT ON COLUMN regions.tax_display_mode IS 'Determines tax display: inclusive (price includes tax) or exclusive (tax shown separately). EU/UK typically use inclusive, US uses exclusive.';
COMMENT ON COLUMN promo_codes.applies_to IS 'Scope of discount: products (subtotal only), shipping (shipping cost only), or order (entire order including shipping)';
COMMENT ON COLUMN users.terms_accepted IS 'Whether user has accepted Terms of Service';
COMMENT ON COLUMN users.privacy_accepted IS 'Whether user has accepted Privacy Policy';
COMMENT ON COLUMN users.preferred_region_id IS 'User manually selected region preference (overrides auto-detection)';
