-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
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

-- Collections table
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  hero_image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items table
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10, 2) NOT NULL,
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_purchase NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_collection ON products(collection);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) Policies

-- Users: Users can only access their own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
-- Allow service role to insert user profiles (for the trigger)
CREATE POLICY "Service role can insert user profiles" ON users FOR INSERT WITH CHECK (true);

-- Products: Public read access
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

-- Collections: Public read access
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collections are viewable by everyone" ON collections FOR SELECT USING (true);

-- Cart items: Users can only access their own cart
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own cart items" ON cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cart items" ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart items" ON cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cart items" ON cart_items FOR DELETE USING (auth.uid() = user_id);

-- Orders: Users can only access their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order items: Users can view order items for their orders
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

-- Insert sample data
INSERT INTO collections (name, slug, description, hero_image_url, display_order) VALUES
  ('Signature Collection', 'signature-collection', 'Our most iconic and timeless fragrances', 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1200', 1),
  ('Limited Edition', 'limited-edition', 'Exclusive and rare fragrances for the discerning collector', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200', 2),
  ('Gift Sets', 'gift-sets', 'Curated collections perfect for gifting', 'https://images.unsplash.com/photo-1549298222-1c31e8915347?w=1200', 3);

INSERT INTO products (name, slug, description, price, size, category, collection, is_new, image_urls, stock_quantity) VALUES
  ('Oud Noir', 'oud-noir', 'A rich and mysterious blend of oud wood, amber, and spices. This luxurious fragrance captures the essence of Arabian nights.', 285.00, '100ml', 'Fragrances', 'Signature Collection', true, ARRAY['https://images.unsplash.com/photo-1541643600914-78b084683601?w=800', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800'], 50),
  ('Rose Lumière', 'rose-lumiere', 'An elegant composition of Bulgarian rose, jasmine, and white musk. Timeless femininity in a bottle.', 265.00, '100ml', 'Fragrances', 'Signature Collection', true, ARRAY['https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?w=800', 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=800'], 45),
  ('Vetiver Sauvage', 'vetiver-sauvage', 'A bold and sophisticated blend of vetiver, bergamot, and cedarwood. For the modern gentleman.', 295.00, '100ml', 'Fragrances', 'Signature Collection', false, ARRAY['https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800'], 60),
  ('Ambre Royal', 'ambre-royal', 'Warm and sensual amber combined with vanilla and tonka bean. A truly regal fragrance.', 320.00, '100ml', 'Fragrances', 'Limited Edition', true, ARRAY['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800'], 30),
  ('Neroli Garden', 'neroli-garden', 'Fresh and uplifting neroli with hints of citrus and green tea. Perfect for spring and summer.', 245.00, '100ml', 'Fragrances', 'Signature Collection', false, ARRAY['https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800'], 55),
  ('Luxury Discovery Set', 'luxury-discovery-set', 'Experience our five signature fragrances in travel-friendly sizes. The perfect introduction to our collection.', 125.00, '5 x 10ml', 'Gift Sets', 'Gift Sets', false, ARRAY['https://images.unsplash.com/photo-1549298222-1c31e8915347?w=800'], 100);
