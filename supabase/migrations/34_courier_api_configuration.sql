-- Courier API Configuration
-- Support for Biteship and DHL API integrations

-- Courier API providers table
CREATE TABLE IF NOT EXISTS courier_api_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_code TEXT UNIQUE NOT NULL, -- 'biteship', 'dhl', 'fedex', etc.
  provider_name TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  api_key_encrypted TEXT, -- Encrypted API key
  api_secret_encrypted TEXT, -- Encrypted API secret
  is_active BOOLEAN DEFAULT true,
  is_sandbox BOOLEAN DEFAULT false,
  configuration JSONB, -- Additional provider-specific config
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courier services mapping (links shipping methods to API providers)
CREATE TABLE IF NOT EXISTS courier_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipping_method_id UUID NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES courier_api_providers(id) ON DELETE CASCADE,
  service_code TEXT NOT NULL, -- Provider's service code (e.g., 'express', 'standard')
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shipping_method_id, provider_id)
);

-- Shipment API requests log (for debugging and auditing)
CREATE TABLE IF NOT EXISTS shipment_api_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES courier_api_providers(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'create_shipment', 'get_rates', 'track_shipment', 'cancel_shipment'
  request_payload JSONB,
  response_payload JSONB,
  response_status INTEGER,
  is_success BOOLEAN DEFAULT false,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courier_api_providers_code ON courier_api_providers(provider_code);
CREATE INDEX IF NOT EXISTS idx_courier_services_shipping_method ON courier_services(shipping_method_id);
CREATE INDEX IF NOT EXISTS idx_courier_services_provider ON courier_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_shipment_api_logs_order ON shipment_api_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_api_logs_provider ON shipment_api_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_shipment_api_logs_created ON shipment_api_logs(created_at DESC);

-- Row Level Security
ALTER TABLE courier_api_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courier API providers are viewable by authenticated users" 
  ON courier_api_providers FOR SELECT 
  USING (auth.role() = 'authenticated');

ALTER TABLE courier_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courier services are viewable by everyone" 
  ON courier_services FOR SELECT 
  USING (true);

ALTER TABLE shipment_api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shipment API logs are viewable by authenticated users" 
  ON shipment_api_logs FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Function to log API request
CREATE OR REPLACE FUNCTION log_shipment_api_request(
  p_order_id UUID,
  p_provider_id UUID,
  p_request_type TEXT,
  p_request_payload JSONB,
  p_response_payload JSONB,
  p_response_status INTEGER,
  p_is_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO shipment_api_logs (
    order_id,
    provider_id,
    request_type,
    request_payload,
    response_payload,
    response_status,
    is_success,
    error_message,
    duration_ms
  ) VALUES (
    p_order_id,
    p_provider_id,
    p_request_type,
    p_request_payload,
    p_response_payload,
    p_response_status,
    p_is_success,
    p_error_message,
    p_duration_ms
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get courier provider for shipping method
CREATE OR REPLACE FUNCTION get_courier_provider_for_shipping_method(
  p_shipping_method_id UUID
) RETURNS TABLE (
  provider_id UUID,
  provider_code TEXT,
  provider_name TEXT,
  service_code TEXT,
  api_base_url TEXT,
  is_sandbox BOOLEAN,
  configuration JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cap.id,
    cap.provider_code,
    cap.provider_name,
    cs.service_code,
    cap.api_base_url,
    cap.is_sandbox,
    cap.configuration
  FROM courier_services cs
  JOIN courier_api_providers cap ON cap.id = cs.provider_id
  WHERE cs.shipping_method_id = p_shipping_method_id
    AND cs.is_active = true
    AND cap.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for clarity
COMMENT ON TABLE courier_api_providers IS 'Stores API configuration for courier service providers like Biteship and DHL';
COMMENT ON TABLE courier_services IS 'Maps shipping methods to courier API providers and their service codes';
COMMENT ON TABLE shipment_api_logs IS 'Audit log for all API requests made to courier providers';
