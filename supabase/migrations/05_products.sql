-- Products table
-- Stores product catalog information

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2),
  size TEXT NOT NULL,
  category TEXT NOT NULL,
  collection TEXT NOT NULL,
  is_new BOOLEAN DEFAULT false,
  image_urls TEXT[] NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_collection ON products(collection);
CREATE INDEX idx_products_slug ON products(slug);

-- Row Level Security (RLS)
-- Public read access for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone" 
  ON products FOR SELECT 
  USING (true);
