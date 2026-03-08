-- Fix wishlist counter and add quantity support

-- Add quantity column to wishlist_items
ALTER TABLE wishlist_items 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1 CHECK (quantity > 0);

-- Update the add_to_wishlist function to handle duplicates properly
CREATE OR REPLACE FUNCTION add_to_wishlist(
  p_user_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  v_wishlist_item_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Check if product exists
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Check if item already exists in wishlist
  SELECT EXISTS (
    SELECT 1 FROM wishlist_items 
    WHERE user_id = p_user_id AND product_id = p_product_id
  ) INTO v_exists;
  
  IF v_exists THEN
    RAISE EXCEPTION 'Product already exists in wishlist';
  END IF;
  
  -- Insert new item
  INSERT INTO wishlist_items (user_id, product_id, quantity)
  VALUES (p_user_id, p_product_id, p_quantity)
  RETURNING id INTO v_wishlist_item_id;
  
  RETURN v_wishlist_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update wishlist item quantity
CREATE OR REPLACE FUNCTION update_wishlist_quantity(
  p_user_id UUID,
  p_product_id UUID,
  p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1';
  END IF;
  
  UPDATE wishlist_items 
  SET quantity = p_quantity
  WHERE user_id = p_user_id AND product_id = p_product_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
