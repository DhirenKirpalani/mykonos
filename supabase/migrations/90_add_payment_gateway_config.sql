-- Add configurable payment gateway settings per region (Indonesia vs Global)
-- Structure:
-- {
--   "ID":     { "enabled": ["midtrans", "stripe"], "default": "midtrans" },
--   "global": { "enabled": ["stripe"],              "default": "stripe" }
-- }
-- "enabled" controls which gateways are available for that region.
-- "default" controls which gateway is actually used at checkout.

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'payment_gateways',
  '{
    "ID": { "enabled": ["midtrans", "stripe"], "default": "midtrans" },
    "global": { "enabled": ["stripe"], "default": "stripe" }
  }'::jsonb,
  'Configures which payment gateway(s) are enabled and used by default for each region (Indonesia vs Global)'
)
ON CONFLICT (setting_key) DO NOTHING;
