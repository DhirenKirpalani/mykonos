-- Seed Courier API Providers
-- Default configuration for Biteship and DHL APIs

-- Insert Biteship provider (for local Indonesian shipping)
INSERT INTO courier_api_providers (
  provider_code,
  provider_name,
  api_base_url,
  is_active,
  is_sandbox,
  configuration
) VALUES (
  'biteship',
  'Biteship',
  'https://api.biteship.com/v1',
  true,
  false,
  '{
    "supported_services": ["jne", "jnt", "sicepat", "anteraja", "ninja", "idexpress"],
    "features": ["tracking", "rates", "create_order"],
    "documentation_url": "https://biteship.com/docs"
  }'::JSONB
);

-- Insert DHL provider (for international shipping)
INSERT INTO courier_api_providers (
  provider_code,
  provider_name,
  api_base_url,
  is_active,
  is_sandbox,
  configuration
) VALUES (
  'dhl',
  'DHL Express',
  'https://api.dhl.com/express/v1',
  true,
  false,
  '{
    "supported_services": ["express_worldwide", "express_12", "express_9"],
    "features": ["tracking", "rates", "create_shipment"],
    "documentation_url": "https://developer.dhl.com"
  }'::JSONB
);

-- Insert FedEx provider
INSERT INTO courier_api_providers (
  provider_code,
  provider_name,
  api_base_url,
  is_active,
  is_sandbox,
  configuration
) VALUES (
  'fedex',
  'FedEx',
  'https://apis.fedex.com',
  true,
  false,
  '{
    "supported_services": ["ground", "express_saver", "2day", "overnight"],
    "features": ["tracking", "rates", "create_shipment"],
    "documentation_url": "https://developer.fedex.com"
  }'::JSONB
);

-- Insert UPS provider
INSERT INTO courier_api_providers (
  provider_code,
  provider_name,
  api_base_url,
  is_active,
  is_sandbox,
  configuration
) VALUES (
  'ups',
  'UPS',
  'https://onlinetools.ups.com/api',
  true,
  false,
  '{
    "supported_services": ["ground", "next_day_air", "2nd_day_air"],
    "features": ["tracking", "rates", "create_shipment"],
    "documentation_url": "https://developer.ups.com"
  }'::JSONB
);

-- Insert USPS provider
INSERT INTO courier_api_providers (
  provider_code,
  provider_name,
  api_base_url,
  is_active,
  is_sandbox,
  configuration
) VALUES (
  'usps',
  'USPS',
  'https://secure.shippingapis.com/ShippingAPI.dll',
  true,
  false,
  '{
    "supported_services": ["priority", "priority_express", "first_class"],
    "features": ["tracking", "rates"],
    "documentation_url": "https://www.usps.com/business/web-tools-apis"
  }'::JSONB
);

-- Insert Royal Mail provider
INSERT INTO courier_api_providers (
  provider_code,
  provider_name,
  api_base_url,
  is_active,
  is_sandbox,
  configuration
) VALUES (
  'royal_mail',
  'Royal Mail',
  'https://api.royalmail.com',
  true,
  false,
  '{
    "supported_services": ["first_class", "second_class", "tracked_24", "tracked_48"],
    "features": ["tracking", "create_shipment"],
    "documentation_url": "https://developer.royalmail.net"
  }'::JSONB
);

-- Insert Aramex provider
INSERT INTO courier_api_providers (
  provider_code,
  provider_name,
  api_base_url,
  is_active,
  is_sandbox,
  configuration
) VALUES (
  'aramex',
  'Aramex',
  'https://ws.aramex.net',
  true,
  false,
  '{
    "supported_services": ["express", "domestic"],
    "features": ["tracking", "rates", "create_shipment"],
    "documentation_url": "https://www.aramex.com/developers"
  }'::JSONB
);

-- Note: API keys should be added separately via secure configuration management
-- Never commit actual API keys to version control
COMMENT ON TABLE courier_api_providers IS 'API keys should be encrypted and managed through secure environment variables or secrets management';
