-- CMS and Product Enhancements
-- Support for homepage content management and product filtering

-- Add fragrance family and editorial priority to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS fragrance_family TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS editorial_priority INTEGER DEFAULT 0;

-- Create index for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_products_fragrance_family ON products(fragrance_family);
CREATE INDEX IF NOT EXISTS idx_products_editorial_priority ON products(editorial_priority DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Homepage hero banners
CREATE TABLE homepage_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  cta_text TEXT,
  cta_link TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Featured collections for homepage
CREATE TABLE featured_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Featured products for homepage
CREATE TABLE featured_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fragrance families reference table
CREATE TABLE fragrance_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_homepage_banners_order ON homepage_banners(display_order, is_active);
CREATE INDEX idx_homepage_banners_dates ON homepage_banners(start_date, end_date);
CREATE INDEX idx_featured_collections_order ON featured_collections(display_order, is_active);
CREATE INDEX idx_featured_products_order ON featured_products(display_order, is_active);

-- Row Level Security (RLS)
ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Homepage banners are viewable by everyone" 
  ON homepage_banners FOR SELECT 
  USING (is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()));

ALTER TABLE featured_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Featured collections are viewable by everyone" 
  ON featured_collections FOR SELECT 
  USING (is_active = true);

ALTER TABLE featured_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Featured products are viewable by everyone" 
  ON featured_products FOR SELECT 
  USING (is_active = true);

ALTER TABLE fragrance_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fragrance families are viewable by everyone" 
  ON fragrance_families FOR SELECT 
  USING (true);
