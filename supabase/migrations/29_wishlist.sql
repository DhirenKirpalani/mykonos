-- Wishlist Functionality
-- Allow users to save favorite products for later

-- Wishlist items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product ON wishlist_items(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_created ON wishlist_items(created_at DESC);

-- Row Level Security
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist items" 
  ON wishlist_items FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add items to their wishlist" 
  ON wishlist_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove items from their wishlist" 
  ON wishlist_items FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to add item to wishlist
CREATE OR REPLACE FUNCTION add_to_wishlist(
  p_user_id UUID,
  p_product_id UUID
) RETURNS UUID AS $$
DECLARE
  v_wishlist_item_id UUID;
BEGIN
  -- Check if product exists
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Insert or return existing
  INSERT INTO wishlist_items (user_id, product_id)
  VALUES (p_user_id, p_product_id)
  ON CONFLICT (user_id, product_id) DO NOTHING
  RETURNING id INTO v_wishlist_item_id;
  
  -- If conflict occurred, get existing id
  IF v_wishlist_item_id IS NULL THEN
    SELECT id INTO v_wishlist_item_id 
    FROM wishlist_items 
    WHERE user_id = p_user_id AND product_id = p_product_id;
  END IF;
  
  RETURN v_wishlist_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove item from wishlist
CREATE OR REPLACE FUNCTION remove_from_wishlist(
  p_user_id UUID,
  p_product_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM wishlist_items 
  WHERE user_id = p_user_id AND product_id = p_product_id;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if product is in wishlist
CREATE OR REPLACE FUNCTION is_in_wishlist(
  p_user_id UUID,
  p_product_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM wishlist_items 
    WHERE user_id = p_user_id AND product_id = p_product_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get wishlist count
CREATE OR REPLACE FUNCTION get_wishlist_count(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM wishlist_items
  WHERE user_id = p_user_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
