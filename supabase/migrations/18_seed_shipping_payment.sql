-- Seed shipping methods and payment methods
-- Region-specific shipping and payment options

-- Shipping methods for US region
INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'USPS',
  'Priority Mail',
  'Fast and reliable delivery',
  9.99,
  2,
  3,
  true,
  1
FROM regions WHERE code = 'US';

INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'FedEx',
  'Ground',
  'Economical ground shipping',
  7.99,
  3,
  5,
  true,
  2
FROM regions WHERE code = 'US';

INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'UPS',
  'Next Day Air',
  'Express overnight delivery',
  29.99,
  1,
  1,
  true,
  3
FROM regions WHERE code = 'US';

-- Shipping methods for EU region
INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'DHL',
  'Standard',
  'Reliable European delivery',
  12.99,
  5,
  7,
  true,
  1
FROM regions WHERE code = 'EU';

INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'DHL',
  'Express',
  'Fast European delivery',
  24.99,
  2,
  3,
  true,
  2
FROM regions WHERE code = 'EU';

-- Shipping methods for UK region
INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'Royal Mail',
  'First Class',
  'Standard UK delivery',
  9.99,
  2,
  3,
  true,
  1
FROM regions WHERE code = 'UK';

INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'DPD',
  'Next Day',
  'Express next day delivery',
  19.99,
  1,
  1,
  true,
  2
FROM regions WHERE code = 'UK';

-- Shipping methods for APAC region
INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'DHL',
  'International',
  'International shipping to Asia Pacific',
  19.99,
  7,
  14,
  true,
  1
FROM regions WHERE code = 'APAC';

-- Shipping methods for MENA region
INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'Aramex',
  'Standard',
  'Middle East delivery',
  19.99,
  7,
  14,
  true,
  1
FROM regions WHERE code = 'MENA';

-- Shipping methods for LATAM region
INSERT INTO shipping_methods (region_id, carrier_name, service_name, description, base_cost, estimated_days_min, estimated_days_max, is_active, display_order)
SELECT 
  id,
  'FedEx',
  'International',
  'Latin America delivery',
  24.99,
  10,
  21,
  true,
  1
FROM regions WHERE code = 'LATAM';

-- Payment methods for US region
INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'card', 'stripe', 'Credit/Debit Card', true, 1 FROM regions WHERE code = 'US';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'paypal', 'paypal', 'PayPal', true, 2 FROM regions WHERE code = 'US';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'apple_pay', 'stripe', 'Apple Pay', true, 3 FROM regions WHERE code = 'US';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'google_pay', 'stripe', 'Google Pay', true, 4 FROM regions WHERE code = 'US';

-- Payment methods for EU region
INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'card', 'stripe', 'Credit/Debit Card', true, 1 FROM regions WHERE code = 'EU';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'paypal', 'paypal', 'PayPal', true, 2 FROM regions WHERE code = 'EU';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'bank_transfer', 'stripe', 'SEPA Bank Transfer', true, 3 FROM regions WHERE code = 'EU';

-- Payment methods for UK region
INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'card', 'stripe', 'Credit/Debit Card', true, 1 FROM regions WHERE code = 'UK';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'paypal', 'paypal', 'PayPal', true, 2 FROM regions WHERE code = 'UK';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'apple_pay', 'stripe', 'Apple Pay', true, 3 FROM regions WHERE code = 'UK';

-- Payment methods for APAC region
INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'card', 'stripe', 'Credit/Debit Card', true, 1 FROM regions WHERE code = 'APAC';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'paypal', 'paypal', 'PayPal', true, 2 FROM regions WHERE code = 'APAC';

-- Payment methods for MENA region
INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'card', 'stripe', 'Credit/Debit Card', true, 1 FROM regions WHERE code = 'MENA';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'paypal', 'paypal', 'PayPal', true, 2 FROM regions WHERE code = 'MENA';

-- Payment methods for LATAM region
INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'card', 'stripe', 'Credit/Debit Card', true, 1 FROM regions WHERE code = 'LATAM';

INSERT INTO payment_methods (region_id, method_type, provider, display_name, is_active, display_order)
SELECT id, 'paypal', 'paypal', 'PayPal', true, 2 FROM regions WHERE code = 'LATAM';
