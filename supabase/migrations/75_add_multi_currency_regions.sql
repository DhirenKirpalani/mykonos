-- Migration: Add Multi-Currency Regions
-- This adds support for 30+ countries with their own currencies

-- Add new regions with proper currency codes
INSERT INTO regions (code, name, currency_code, currency_symbol, tax_rate, is_active) VALUES
  -- Asia Pacific
  ('SG', 'Singapore', 'SGD', 'S$', 9.00, true),
  ('MY', 'Malaysia', 'MYR', 'RM', 10.00, true),
  ('AU', 'Australia', 'AUD', 'A$', 10.00, true),
  ('TH', 'Thailand', 'THB', '฿', 7.00, true),
  ('PH', 'Philippines', 'PHP', '₱', 12.00, true),
  ('JP', 'Japan', 'JPY', '¥', 10.00, true),
  ('KR', 'South Korea', 'KRW', '₩', 10.00, true),
  ('NZ', 'New Zealand', 'NZD', 'NZ$', 15.00, true),
  ('IN', 'India', 'INR', '₹', 18.00, true),
  ('PK', 'Pakistan', 'PKR', 'Rs', 18.00, true),
  ('HK', 'Hong Kong', 'HKD', 'HK$', 0.00, true),
  ('TW', 'Taiwan', 'TWD', 'NT$', 5.00, true),
  ('VN', 'Vietnam', 'VND', '₫', 10.00, true),
  
  -- North America
  ('CA', 'Canada', 'CAD', 'C$', 13.00, true),
  ('MX', 'Mexico', 'MXN', 'Mex$', 16.00, true),
  
  -- Middle East & Africa
  ('AE', 'UAE', 'AED', 'د.إ', 5.00, true),
  ('SA', 'Saudi Arabia', 'SAR', 'ر.س', 15.00, true),
  ('QA', 'Qatar', 'QAR', 'ر.ق', 0.00, true),
  ('OM', 'Oman', 'OMR', 'ر.ع.', 5.00, true),
  ('BH', 'Bahrain', 'BHD', 'د.ب', 10.00, true),
  ('KW', 'Kuwait', 'KWD', 'د.ك', 0.00, true),
  ('JO', 'Jordan', 'JOD', 'د.ا', 16.00, true),
  ('LB', 'Lebanon', 'LBP', 'ل.ل', 11.00, true),
  ('EG', 'Egypt', 'EGP', 'ج.م', 14.00, true),
  ('ZA', 'South Africa', 'ZAR', 'R', 15.00, true),
  ('NG', 'Nigeria', 'NGN', '₦', 7.50, true),
  
  -- Europe (additional)
  ('CH', 'Switzerland', 'CHF', 'Fr', 7.70, true),
  ('NO', 'Norway', 'NOK', 'kr', 25.00, true),
  ('SE', 'Sweden', 'SEK', 'kr', 25.00, true),
  ('DK', 'Denmark', 'DKK', 'kr', 25.00, true),
  ('TR', 'Turkey', 'TRY', '₺', 20.00, true),
  ('IL', 'Israel', 'ILS', '₪', 17.00, true),
  
  -- South America
  ('BR', 'Brazil', 'BRL', 'R$', 17.00, true),
  ('AR', 'Argentina', 'ARS', '$', 21.00, true),
  ('CL', 'Chile', 'CLP', '$', 19.00, true),
  ('CO', 'Colombia', 'COP', '$', 19.00, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  currency_code = EXCLUDED.currency_code,
  currency_symbol = EXCLUDED.currency_symbol,
  tax_rate = EXCLUDED.tax_rate,
  is_active = EXCLUDED.is_active;

-- Delete existing mappings for these countries to avoid duplicates
DELETE FROM country_regions 
WHERE country_code IN ('SG', 'MY', 'AU', 'TH', 'PH', 'JP', 'KR', 'NZ', 'IN', 'PK', 'HK', 'TW', 'VN',
                       'CA', 'MX', 'AE', 'SA', 'QA', 'OM', 'BH', 'KW', 'JO', 'LB', 'EG', 'ZA', 'NG',
                       'CH', 'NO', 'SE', 'DK', 'TR', 'IL', 'BR', 'AR', 'CL', 'CO');

-- Add country mappings for all new regions
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT country_code, region_id, true, 5, 10
FROM (VALUES
  -- Asia Pacific
  ('SG', (SELECT id FROM regions WHERE code = 'SG')),
  ('MY', (SELECT id FROM regions WHERE code = 'MY')),
  ('AU', (SELECT id FROM regions WHERE code = 'AU')),
  ('TH', (SELECT id FROM regions WHERE code = 'TH')),
  ('PH', (SELECT id FROM regions WHERE code = 'PH')),
  ('JP', (SELECT id FROM regions WHERE code = 'JP')),
  ('KR', (SELECT id FROM regions WHERE code = 'KR')),
  ('NZ', (SELECT id FROM regions WHERE code = 'NZ')),
  ('IN', (SELECT id FROM regions WHERE code = 'IN')),
  ('PK', (SELECT id FROM regions WHERE code = 'PK')),
  ('HK', (SELECT id FROM regions WHERE code = 'HK')),
  ('TW', (SELECT id FROM regions WHERE code = 'TW')),
  ('VN', (SELECT id FROM regions WHERE code = 'VN')),
  
  -- North America
  ('CA', (SELECT id FROM regions WHERE code = 'CA')),
  ('MX', (SELECT id FROM regions WHERE code = 'MX')),
  
  -- Middle East & Africa
  ('AE', (SELECT id FROM regions WHERE code = 'AE')),
  ('SA', (SELECT id FROM regions WHERE code = 'SA')),
  ('QA', (SELECT id FROM regions WHERE code = 'QA')),
  ('OM', (SELECT id FROM regions WHERE code = 'OM')),
  ('BH', (SELECT id FROM regions WHERE code = 'BH')),
  ('KW', (SELECT id FROM regions WHERE code = 'KW')),
  ('JO', (SELECT id FROM regions WHERE code = 'JO')),
  ('LB', (SELECT id FROM regions WHERE code = 'LB')),
  ('EG', (SELECT id FROM regions WHERE code = 'EG')),
  ('ZA', (SELECT id FROM regions WHERE code = 'ZA')),
  ('NG', (SELECT id FROM regions WHERE code = 'NG')),
  
  -- Europe (additional)
  ('CH', (SELECT id FROM regions WHERE code = 'CH')),
  ('NO', (SELECT id FROM regions WHERE code = 'NO')),
  ('SE', (SELECT id FROM regions WHERE code = 'SE')),
  ('DK', (SELECT id FROM regions WHERE code = 'DK')),
  ('TR', (SELECT id FROM regions WHERE code = 'TR')),
  ('IL', (SELECT id FROM regions WHERE code = 'IL')),
  
  -- South America
  ('BR', (SELECT id FROM regions WHERE code = 'BR')),
  ('AR', (SELECT id FROM regions WHERE code = 'AR')),
  ('CL', (SELECT id FROM regions WHERE code = 'CL')),
  ('CO', (SELECT id FROM regions WHERE code = 'CO'))
) AS new_countries(country_code, region_id);

-- Create shipping zones for new regions (flat rate for now)
INSERT INTO shipping_zones (region_id, name, base_rate, free_shipping_threshold)
SELECT 
  r.id,
  r.name || ' Standard Shipping',
  15.00,
  100.00
FROM regions r
WHERE r.code IN ('SG', 'MY', 'AU', 'TH', 'PH', 'JP', 'KR', 'NZ', 'IN', 'PK', 'HK', 'TW', 'VN',
                 'CA', 'MX', 'AE', 'SA', 'QA', 'OM', 'BH', 'KW', 'JO', 'LB', 'EG', 'ZA', 'NG',
                 'CH', 'NO', 'SE', 'DK', 'TR', 'IL', 'BR', 'AR', 'CL', 'CO')
ON CONFLICT DO NOTHING;
