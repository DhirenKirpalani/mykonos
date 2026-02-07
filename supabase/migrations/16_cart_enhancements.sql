-- Shopping Cart Enhancements
-- Support for guest carts, cart validation, and price tracking

-- Add guest cart support (session-based)
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS price_at_add NUMERIC(10, 2);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Drop old unique constraint and create new one supporting guest carts
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product ON cart_items(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_session_product ON cart_items(session_id, product_id) WHERE session_id IS NOT NULL;

-- Make user_id nullable for guest carts
ALTER TABLE cart_items ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or session_id is present
ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_or_session_check 
  CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Create index for session-based lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id) WHERE session_id IS NOT NULL;

-- Update RLS policies for guest cart support
DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items;

-- New RLS policies supporting both authenticated and guest users
CREATE POLICY "Users can view their own cart items" 
  ON cart_items FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert their own cart items" 
  ON cart_items FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id AND session_id IS NULL) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update their own cart items" 
  ON cart_items FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can delete their own cart items" 
  ON cart_items FOR DELETE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- Function to merge guest cart into user cart on login
CREATE OR REPLACE FUNCTION merge_guest_cart(
  p_session_id TEXT,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_cart_item RECORD;
BEGIN
  -- Loop through guest cart items
  FOR v_cart_item IN 
    SELECT * FROM cart_items WHERE session_id = p_session_id
  LOOP
    -- Check if user already has this product in cart
    IF EXISTS (
      SELECT 1 FROM cart_items 
      WHERE user_id = p_user_id AND product_id = v_cart_item.product_id
    ) THEN
      -- Update quantity (add guest quantity to existing)
      UPDATE cart_items 
      SET quantity = quantity + v_cart_item.quantity,
          updated_at = NOW()
      WHERE user_id = p_user_id AND product_id = v_cart_item.product_id;
    ELSE
      -- Insert new item with user_id
      INSERT INTO cart_items (user_id, product_id, quantity, price_at_add, created_at, updated_at)
      VALUES (p_user_id, v_cart_item.product_id, v_cart_item.quantity, v_cart_item.price_at_add, v_cart_item.created_at, NOW());
    END IF;
  END LOOP;
  
  -- Delete guest cart items
  DELETE FROM cart_items WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate cart (inventory, prices, promo eligibility)
CREATE OR REPLACE FUNCTION validate_cart_item(
  p_cart_item_id UUID
) RETURNS TABLE (
  is_valid BOOLEAN,
  issue_type TEXT,
  issue_message TEXT,
  current_price NUMERIC,
  current_stock INTEGER
) AS $$
DECLARE
  v_cart_item cart_items%ROWTYPE;
  v_product products%ROWTYPE;
BEGIN
  -- Get cart item
  SELECT * INTO v_cart_item FROM cart_items WHERE id = p_cart_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, 'Cart item not found'::TEXT, 0::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;
  
  -- Get product
  SELECT * INTO v_product FROM products WHERE id = v_cart_item.product_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'product_not_found'::TEXT, 'Product no longer available'::TEXT, 0::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;
  
  -- Check inventory
  IF v_product.stock_quantity < v_cart_item.quantity THEN
    RETURN QUERY SELECT 
      false, 
      'insufficient_stock'::TEXT, 
      format('Only %s items available', v_product.stock_quantity)::TEXT,
      COALESCE(v_product.sale_price, v_product.price),
      v_product.stock_quantity;
    RETURN;
  END IF;
  
  -- Check price changes
  IF v_cart_item.price_at_add IS NOT NULL THEN
    IF COALESCE(v_product.sale_price, v_product.price) != v_cart_item.price_at_add THEN
      RETURN QUERY SELECT 
        true, 
        'price_changed'::TEXT, 
        format('Price changed from %s to %s', v_cart_item.price_at_add, COALESCE(v_product.sale_price, v_product.price))::TEXT,
        COALESCE(v_product.sale_price, v_product.price),
        v_product.stock_quantity;
      RETURN;
    END IF;
  END IF;
  
  -- All validations passed
  RETURN QUERY SELECT 
    true, 
    NULL::TEXT, 
    NULL::TEXT,
    COALESCE(v_product.sale_price, v_product.price),
    v_product.stock_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
