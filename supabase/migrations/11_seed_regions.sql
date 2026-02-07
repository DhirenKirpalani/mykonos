-- Seed data for regions and country mappings
-- Default regions with currencies

-- Insert regions
INSERT INTO regions (code, name, currency_code, currency_symbol, tax_rate, is_active) VALUES
  ('US', 'United States', 'USD', '$', 0.00, true),
  ('EU', 'European Union', 'EUR', '€', 20.00, true),
  ('UK', 'United Kingdom', 'GBP', '£', 20.00, true),
  ('APAC', 'Asia Pacific', 'USD', '$', 0.00, true),
  ('MENA', 'Middle East & North Africa', 'USD', '$', 0.00, true),
  ('LATAM', 'Latin America', 'USD', '$', 0.00, true);

-- Map countries to regions
-- United States
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT 'US', id, true, 3, 5 FROM regions WHERE code = 'US';

-- European Union countries
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT country_code, (SELECT id FROM regions WHERE code = 'EU'), true, 5, 10
FROM (VALUES 
  ('FR'), ('DE'), ('IT'), ('ES'), ('NL'), ('BE'), ('AT'), ('PT'), ('GR'), 
  ('PL'), ('CZ'), ('HU'), ('RO'), ('BG'), ('HR'), ('SI'), ('SK'), ('EE'), 
  ('LV'), ('LT'), ('DK'), ('SE'), ('FI'), ('IE')
) AS eu_countries(country_code);

-- United Kingdom
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT 'GB', id, true, 3, 7 FROM regions WHERE code = 'UK';

-- Asia Pacific
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT country_code, (SELECT id FROM regions WHERE code = 'APAC'), true, 7, 14
FROM (VALUES 
  ('JP'), ('KR'), ('CN'), ('SG'), ('HK'), ('AU'), ('NZ'), ('IN')
) AS apac_countries(country_code);

-- Middle East & North Africa
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT country_code, (SELECT id FROM regions WHERE code = 'MENA'), true, 7, 14
FROM (VALUES 
  ('AE'), ('SA'), ('IL'), ('TR')
) AS mena_countries(country_code);

-- Latin America
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT country_code, (SELECT id FROM regions WHERE code = 'LATAM'), true, 10, 21
FROM (VALUES 
  ('BR'), ('MX'), ('AR'), ('CL'), ('CO')
) AS latam_countries(country_code);

-- Canada (uses US region)
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT 'CA', id, true, 5, 10 FROM regions WHERE code = 'US';

-- Switzerland and Norway (use EU pricing but separate shipping)
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT country_code, (SELECT id FROM regions WHERE code = 'EU'), true, 7, 14
FROM (VALUES ('CH'), ('NO')) AS other_eu(country_code);

-- South Africa (uses APAC region)
INSERT INTO country_regions (country_code, region_id, is_shipping_available, estimated_delivery_days_min, estimated_delivery_days_max)
SELECT 'ZA', id, true, 10, 21 FROM regions WHERE code = 'APAC';

-- Insert shipping zones
INSERT INTO shipping_zones (region_id, name, base_rate, free_shipping_threshold)
SELECT id, 'Standard Shipping', 9.99, 100.00 FROM regions WHERE code = 'US';

INSERT INTO shipping_zones (region_id, name, base_rate, free_shipping_threshold)
SELECT id, 'Standard Shipping', 12.99, 150.00 FROM regions WHERE code = 'EU';

INSERT INTO shipping_zones (region_id, name, base_rate, free_shipping_threshold)
SELECT id, 'Standard Shipping', 9.99, 100.00 FROM regions WHERE code = 'UK';

INSERT INTO shipping_zones (region_id, name, base_rate, free_shipping_threshold)
SELECT id, 'International Shipping', 19.99, 200.00 FROM regions WHERE code = 'APAC';

INSERT INTO shipping_zones (region_id, name, base_rate, free_shipping_threshold)
SELECT id, 'International Shipping', 19.99, 200.00 FROM regions WHERE code = 'MENA';

INSERT INTO shipping_zones (region_id, name, base_rate, free_shipping_threshold)
SELECT id, 'International Shipping', 24.99, 250.00 FROM regions WHERE code = 'LATAM';
