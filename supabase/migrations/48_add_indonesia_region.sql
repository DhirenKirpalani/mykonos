-- Add Indonesia as a separate primary region (home country)
-- Keep APAC with USD for other Asian countries

-- Add Indonesia as a dedicated region
INSERT INTO regions (code, name, currency_code, currency_symbol, tax_rate, is_active)
VALUES ('ID', 'Indonesia', 'IDR', 'Rp', 11.00, true)
ON CONFLICT (code) DO UPDATE SET
  name = 'Indonesia',
  currency_code = 'IDR',
  currency_symbol = 'Rp',
  tax_rate = 11.00,
  is_active = true;

-- Map Indonesia country to Indonesia region
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT 'ID', id, true, 1, 3 
FROM regions 
WHERE code = 'ID'
ON CONFLICT (country_code, region_id) DO UPDATE SET
  is_shipping_available = true,
  estimated_delivery_days_min = 1,
  estimated_delivery_days_max = 3;

-- Add domestic shipping zone for Indonesia
INSERT INTO shipping_zones (region_id, name, base_rate, free_shipping_threshold)
SELECT id, 'Domestic Shipping (Indonesia)', 25000.00, 500000.00 
FROM regions 
WHERE code = 'ID'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE country_regions IS 'Indonesia (ID) is now a primary region with IDR currency - home country with fastest delivery';
