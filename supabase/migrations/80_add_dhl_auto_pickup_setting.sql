-- Add DHL Auto-Pickup system setting
-- This setting controls whether to automatically request DHL pickup when creating shipments

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'dhl_auto_pickup',
  '{"enabled": false, "closeTime": "18:00", "location": "reception"}'::jsonb,
  'Automatically request DHL pickup when creating shipments. Configure pickup close time and location for DHL courier.'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = jsonb_set(
    jsonb_set(
      system_settings.setting_value,
      '{closeTime}',
      '"18:00"'::jsonb,
      true
    ),
    '{location}',
    '"reception"'::jsonb,
    true
  )
WHERE NOT (system_settings.setting_value ? 'closeTime' AND system_settings.setting_value ? 'location');
