-- Regions and pricing tables
-- Supports multi-region pricing, currencies, and shipping zones

-- Regions table
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'US', 'EU', 'UK', 'APAC'
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL, -- e.g., 'USD', 'EUR', 'GBP'
  currency_symbol TEXT NOT NULL, -- e.g., '$', '€', '£'
  tax_rate NUMERIC(5, 2) DEFAULT 0, -- e.g., 20.00 for 20%
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Country to region mapping
CREATE TABLE country_regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  is_shipping_available BOOLEAN DEFAULT true,
  estimated_delivery_days_min INTEGER,
  estimated_delivery_days_max INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(country_code, region_id)
);

-- Regional pricing for products
CREATE TABLE product_regional_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, region_id)
);

-- Shipping zones and rates
CREATE TABLE shipping_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_rate NUMERIC(10, 2) NOT NULL,
  free_shipping_threshold NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_country_regions_country ON country_regions(country_code);
CREATE INDEX idx_country_regions_region ON country_regions(region_id);
CREATE INDEX idx_product_regional_pricing_product ON product_regional_pricing(product_id);
CREATE INDEX idx_product_regional_pricing_region ON product_regional_pricing(region_id);
CREATE INDEX idx_shipping_zones_region ON shipping_zones(region_id);

-- Row Level Security (RLS)
-- Public read access for regions and pricing
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Regions are viewable by everyone" 
  ON regions FOR SELECT 
  USING (is_active = true);

ALTER TABLE country_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Country regions are viewable by everyone" 
  ON country_regions FOR SELECT 
  USING (true);

ALTER TABLE product_regional_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product regional pricing is viewable by everyone" 
  ON product_regional_pricing FOR SELECT 
  USING (true);

ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shipping zones are viewable by everyone" 
  ON shipping_zones FOR SELECT 
  USING (true);
