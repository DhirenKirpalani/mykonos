-- Update create_order_from_checkout to handle guest_shipping_address
CREATE OR REPLACE FUNCTION create_order_from_checkout(
  p_checkout_session_id UUID,
  p_payment_intent_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_session checkout_sessions%ROWTYPE;
  v_order_id UUID;
  v_order_number TEXT;
  v_cart_item RECORD;
  v_shipping_address JSONB;
BEGIN
  -- Get checkout session
  SELECT * INTO v_session FROM checkout_sessions WHERE id = p_checkout_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout session not found';
  END IF;
  
  -- Get shipping address as JSONB
  -- First check if there's a shipping_address_id (authenticated users)
  IF v_session.shipping_address_id IS NOT NULL THEN
    SELECT to_jsonb(shipping_addresses.*) INTO v_shipping_address
    FROM shipping_addresses
    WHERE id = v_session.shipping_address_id;
    
    IF v_shipping_address IS NULL THEN
      RAISE EXCEPTION 'Shipping address not found';
    END IF;
  -- Otherwise check for guest_shipping_address (guest/anonymous users)
  ELSIF v_session.guest_shipping_address IS NOT NULL THEN
    v_shipping_address := v_session.guest_shipping_address;
  ELSE
    RAISE EXCEPTION 'Shipping address is required';
  END IF;
  
  -- Generate order number
  v_order_number := generate_order_number();
  
  -- Create order
  INSERT INTO orders (
    user_id,
    order_number,
    status,
    shipping_address,
    shipping_method_id,
    payment_method,
    payment_status,
    payment_intent_id,
    subtotal,
    discount_amount,
    promo_code_id,
    shipping_cost,
    tax_amount,
    total_amount,
    currency_code,
    is_locked,
    completed_at
  )
  VALUES (
    v_session.user_id,
    v_order_number,
    'processing',
    v_shipping_address,
    v_session.shipping_method_id,
    v_session.payment_method_type,
    'completed',
    p_payment_intent_id,
    (v_session.pricing_snapshot->>'subtotal')::NUMERIC,
    (v_session.pricing_snapshot->>'discount')::NUMERIC,
    v_session.promo_code_id,
    (v_session.pricing_snapshot->>'shipping')::NUMERIC,
    (v_session.pricing_snapshot->>'tax')::NUMERIC,
    (v_session.pricing_snapshot->>'total')::NUMERIC,
    v_session.pricing_snapshot->>'currency_code',
    true,
    NOW()
  )
  RETURNING id INTO v_order_id;
  
  -- Create order items from cart snapshot
  FOR v_cart_item IN 
    SELECT * FROM jsonb_to_recordset(v_session.cart_snapshot) 
    AS items(product_id UUID, quantity INTEGER, price NUMERIC)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
    VALUES (v_order_id, v_cart_item.product_id, v_cart_item.quantity, v_cart_item.price);
    
    -- Reduce inventory
    UPDATE products 
    SET stock_quantity = stock_quantity - v_cart_item.quantity
    WHERE id = v_cart_item.product_id;
  END LOOP;
  
  -- Complete reservations
  PERFORM complete_reservations(p_checkout_session_id);
  
  -- Record promo code usage if applicable
  IF v_session.promo_code_id IS NOT NULL THEN
    PERFORM record_promo_code_usage(
      v_session.promo_code_id,
      v_session.user_id,
      v_order_id,
      (v_session.pricing_snapshot->>'discount')::NUMERIC
    );
  END IF;
  
  -- Add initial status history
  INSERT INTO order_status_history (order_id, status, notes)
  VALUES (v_order_id, 'processing', 'Order created and payment confirmed');
  
  -- Clear user's cart
  IF v_session.user_id IS NOT NULL THEN
    DELETE FROM cart_items WHERE user_id = v_session.user_id;
  ELSE
    DELETE FROM cart_items WHERE session_id = v_session.session_id;
  END IF;
  
  -- Delete checkout session
  DELETE FROM checkout_sessions WHERE id = p_checkout_session_id;
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
