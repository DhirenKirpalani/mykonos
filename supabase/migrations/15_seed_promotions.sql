-- Seed promo codes for testing
-- Sample promo codes with different configurations

-- Percentage discount - 10% off
INSERT INTO promo_codes (
  code, 
  description, 
  discount_type, 
  discount_value,
  min_purchase_amount,
  usage_limit_global,
  usage_limit_per_user,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'WELCOME10',
  'Welcome discount - 10% off your first order',
  'percentage',
  10.00,
  50.00,
  1000,
  1,
  NOW(),
  NOW() + INTERVAL '30 days',
  true
);

-- Percentage discount - 20% off with max cap
INSERT INTO promo_codes (
  code, 
  description, 
  discount_type, 
  discount_value,
  min_purchase_amount,
  max_discount_amount,
  usage_limit_global,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'SPRING20',
  'Spring Sale - 20% off (max $50 discount)',
  'percentage',
  20.00,
  100.00,
  50.00,
  500,
  NOW(),
  NOW() + INTERVAL '60 days',
  true
);

-- Fixed amount discount
INSERT INTO promo_codes (
  code, 
  description, 
  discount_type, 
  discount_value,
  min_purchase_amount,
  usage_limit_per_user,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'SAVE25',
  'Save $25 on orders over $150',
  'fixed',
  25.00,
  150.00,
  3,
  NOW(),
  NOW() + INTERVAL '90 days',
  true
);

-- VIP discount - high value
INSERT INTO promo_codes (
  code, 
  description, 
  discount_type, 
  discount_value,
  min_purchase_amount,
  usage_limit_global,
  usage_limit_per_user,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'VIP50',
  'VIP Members - $50 off orders over $200',
  'fixed',
  50.00,
  200.00,
  100,
  1,
  NOW(),
  NOW() + INTERVAL '365 days',
  true
);

-- Free shipping equivalent (small fixed discount)
INSERT INTO promo_codes (
  code, 
  description, 
  discount_type, 
  discount_value,
  min_purchase_amount,
  max_discount_amount,
  usage_limit_per_user,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'FREESHIP',
  'Free shipping on all orders',
  'fixed',
  15.00,
  0.00,
  15.00,
  5,
  NOW(),
  NOW() + INTERVAL '180 days',
  true
);

-- Region-specific promo code (US only)
INSERT INTO promo_codes (
  code, 
  description, 
  discount_type, 
  discount_value,
  min_purchase_amount,
  usage_limit_global,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'USA15',
  'US Customers - 15% off',
  'percentage',
  15.00,
  75.00,
  200,
  NOW(),
  NOW() + INTERVAL '45 days',
  true
);

-- Add region restriction for USA15 promo code
INSERT INTO promo_code_regions (promo_code_id, region_id)
SELECT 
  (SELECT id FROM promo_codes WHERE code = 'USA15'),
  id
FROM regions WHERE code = 'US';

-- Region-specific promo code (EU only)
INSERT INTO promo_codes (
  code, 
  description, 
  discount_type, 
  discount_value,
  min_purchase_amount,
  usage_limit_global,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'EU20',
  'European Customers - 20% off',
  'percentage',
  20.00,
  100.00,
  300,
  NOW(),
  NOW() + INTERVAL '45 days',
  true
);

-- Add region restriction for EU20 promo code
INSERT INTO promo_code_regions (promo_code_id, region_id)
SELECT 
  (SELECT id FROM promo_codes WHERE code = 'EU20'),
  id
FROM regions WHERE code = 'EU';

-- Update regional pricing to include pricing type
UPDATE product_regional_pricing 
SET pricing_type = 'local'
WHERE region_id IN (SELECT id FROM regions WHERE code IN ('US', 'EU', 'UK'));

-- For other regions, mark as international pricing
UPDATE product_regional_pricing 
SET pricing_type = 'international'
WHERE region_id IN (SELECT id FROM regions WHERE code IN ('APAC', 'MENA', 'LATAM'));
