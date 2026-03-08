-- Add new product fields for enhanced product management
-- Migration: 71_add_product_fields.sql

-- Add SKU and Brand fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;

-- Add pricing fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_idr NUMERIC(15, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10, 2);

-- Add inventory management fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true;

-- Add product specifications
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume_ml INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_weight_grams NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS shelf_life_months INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS formulation TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS edition_type TEXT;

-- Add shipping/package dimensions
ALTER TABLE products ADD COLUMN IF NOT EXISTS package_length_cm NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS package_width_cm NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS package_height_cm NUMERIC(10, 2);

-- Add fragrance-specific fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS fragrance_family TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS country_of_origin TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS top_notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS middle_notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_notes TEXT;

-- Add compliance and regulatory fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS bpom_number TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS halal_certified BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturing_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ships_from TEXT DEFAULT 'KOTA JAKARTA TIMUR';

-- Add product status and visibility
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Add purchase limits
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_purchase_quantity INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_purchase_quantity INTEGER;

-- Add pre-order functionality
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pre_order BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pre_order_duration_days INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS scheduled_publish_date TIMESTAMP WITH TIME ZONE;

-- Add SEO fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_keywords TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT;

-- Add image alt texts for accessibility and SEO
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_alt_texts TEXT[];

-- Add bulk discounts (JSONB for flexible structure)
ALTER TABLE products ADD COLUMN IF NOT EXISTS bulk_discounts JSONB DEFAULT '[]'::jsonb;

-- Add product variants (JSONB for flexible structure)
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_fragrance_family ON products(fragrance_family);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING gin(to_tsvector('english', tags));

-- Add comments for documentation
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit - unique product identifier';
COMMENT ON COLUMN products.brand IS 'Product brand name';
COMMENT ON COLUMN products.cost_price IS 'Cost price for profit margin calculation';
COMMENT ON COLUMN products.compare_at_price IS 'Original price for showing discounts';
COMMENT ON COLUMN products.allow_backorder IS 'Allow orders when out of stock';
COMMENT ON COLUMN products.low_stock_threshold IS 'Alert threshold for low stock';
COMMENT ON COLUMN products.bulk_discounts IS 'Array of {quantity, discount_percentage} objects';
COMMENT ON COLUMN products.variants IS 'Array of product variant objects with name, sku, price, stock';
COMMENT ON COLUMN products.status IS 'Product status: draft, active, or archived';
COMMENT ON COLUMN products.image_alt_texts IS 'Alt text for each image for SEO and accessibility';
