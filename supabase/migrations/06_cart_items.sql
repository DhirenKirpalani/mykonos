-- Cart items table
-- Stores shopping cart items for authenticated users

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Indexes
CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- Row Level Security (RLS)
-- Users can only access their own cart
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart items" 
  ON cart_items FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items" 
  ON cart_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" 
  ON cart_items FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" 
  ON cart_items FOR DELETE 
  USING (auth.uid() = user_id);
