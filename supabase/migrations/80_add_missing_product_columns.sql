-- Add missing product columns that may not exist in the schema
-- Uses IF NOT EXISTS to be safe on fresh installs

ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price_idr NUMERIC(15, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS pre_order_release_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pilih_lokal BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_selling BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS products_sold INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_urls TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_product_duration_days INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS halal_certified BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_mg NUMERIC(10, 2);

COMMENT ON COLUMN products.compare_at_price IS 'Compare-at price in USD for showing discounts';
COMMENT ON COLUMN products.compare_at_price_idr IS 'Compare-at price in IDR for showing discounts';
COMMENT ON COLUMN products.cost_price_idr IS 'Cost price in IDR for profit margin calculation';
COMMENT ON COLUMN products.pre_order_release_date IS 'Scheduled release date for pre-order products';
COMMENT ON COLUMN products.pilih_lokal IS 'Flag for Pilih Lokal (local product) badge';
COMMENT ON COLUMN products.is_popular IS 'Flag for popular product listing on homepage';
COMMENT ON COLUMN products.is_best_selling IS 'Flag for best selling product listing';
COMMENT ON COLUMN products.rating IS 'Product rating from 0 to 5';
COMMENT ON COLUMN products.products_sold IS 'Total number of units sold';
COMMENT ON COLUMN products.video_urls IS 'Array of product video URLs';
COMMENT ON COLUMN products.new_product_duration_days IS 'Days to show the NEW badge after creation';
COMMENT ON COLUMN products.halal_certified IS 'Whether the product is Halal certified';
