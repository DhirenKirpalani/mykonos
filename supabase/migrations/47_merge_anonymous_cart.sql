-- Function to merge anonymous user's cart to logged-in user
-- This handles the case where a guest adds items to cart, then logs in with existing account

CREATE OR REPLACE FUNCTION merge_anonymous_cart_to_user(
  p_anonymous_user_id UUID,
  p_logged_in_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_merged_count INTEGER := 0;
  v_cart_item RECORD;
BEGIN
  -- Don't merge if same user
  IF p_anonymous_user_id = p_logged_in_user_id THEN
    RETURN 0;
  END IF;

  -- Loop through anonymous user's cart items
  FOR v_cart_item IN 
    SELECT * FROM cart_items 
    WHERE user_id = p_anonymous_user_id
  LOOP
    -- Check if logged-in user already has this product in cart
    IF EXISTS (
      SELECT 1 FROM cart_items 
      WHERE user_id = p_logged_in_user_id 
      AND product_id = v_cart_item.product_id
    ) THEN
      -- Update quantity (add anonymous cart quantity to existing)
      UPDATE cart_items
      SET 
        quantity = quantity + v_cart_item.quantity,
        updated_at = NOW()
      WHERE user_id = p_logged_in_user_id 
      AND product_id = v_cart_item.product_id;
    ELSE
      -- Transfer item to logged-in user
      UPDATE cart_items
      SET 
        user_id = p_logged_in_user_id,
        updated_at = NOW()
      WHERE id = v_cart_item.id;
    END IF;
    
    v_merged_count := v_merged_count + 1;
  END LOOP;

  -- Delete any remaining anonymous cart items (in case of duplicates)
  DELETE FROM cart_items WHERE user_id = p_anonymous_user_id;

  RETURN v_merged_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to merge anonymous user's wishlist to logged-in user
CREATE OR REPLACE FUNCTION merge_anonymous_wishlist_to_user(
  p_anonymous_user_id UUID,
  p_logged_in_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_merged_count INTEGER := 0;
BEGIN
  -- Don't merge if same user
  IF p_anonymous_user_id = p_logged_in_user_id THEN
    RETURN 0;
  END IF;

  -- Transfer wishlist items that don't already exist for logged-in user
  UPDATE wishlist_items
  SET 
    user_id = p_logged_in_user_id,
    updated_at = NOW()
  WHERE user_id = p_anonymous_user_id
  AND product_id NOT IN (
    SELECT product_id FROM wishlist_items 
    WHERE user_id = p_logged_in_user_id
  );

  GET DIAGNOSTICS v_merged_count = ROW_COUNT;

  -- Delete any remaining anonymous wishlist items
  DELETE FROM wishlist_items WHERE user_id = p_anonymous_user_id;

  RETURN v_merged_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION merge_anonymous_cart_to_user IS 'Merges anonymous user cart items to logged-in user account';
COMMENT ON FUNCTION merge_anonymous_wishlist_to_user IS 'Merges anonymous user wishlist items to logged-in user account';
