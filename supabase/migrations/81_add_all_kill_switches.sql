-- Add all kill switch system settings with default values

-- Checkout (already exists, but ensure it's there)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'checkout_enabled',
  '{"enabled": true}'::jsonb,
  'Allow customers to complete checkout and place orders. When disabled, checkout page will be inaccessible.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Payment Processing
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'payments_enabled',
  '{"enabled": true}'::jsonb,
  'Enable payment gateway processing for orders. When disabled, payment processing will be blocked.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Promo Codes
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'promo_codes_enabled',
  '{"enabled": true}'::jsonb,
  'Allow customers to apply discount codes at checkout. When disabled, promo code input will be hidden.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- User Registration
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'user_registration_enabled',
  '{"enabled": true}'::jsonb,
  'Allow new users to create accounts. When disabled, registration page will show a message that new registrations are temporarily closed.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Wishlist
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'wishlist_enabled',
  '{"enabled": true}'::jsonb,
  'Allow customers to add products to wishlist. When disabled, wishlist buttons will be hidden.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Email Notifications
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'email_notifications_enabled',
  '{"enabled": true}'::jsonb,
  'Send automated emails to customers (order confirmations, shipping notifications, etc). When disabled, no emails will be sent.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Order Notifications
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'order_notifications_enabled',
  '{"enabled": true}'::jsonb,
  'Send order status update notifications to customers. When disabled, status update emails will not be sent.'
)
ON CONFLICT (setting_key) DO NOTHING;
