-- Investigate orders with null checkout_session_id

-- 1. Find all orders with null checkout_session_id
SELECT 
  'Orders with NULL checkout_session_id' as issue,
  order_number,
  customer_email,
  shipping_address IS NULL as missing_address,
  checkout_session_id IS NULL as missing_session,
  stripe_session_id,
  payment_gateway,
  created_at
FROM orders
WHERE checkout_session_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check if this is a Stripe direct order
SELECT 
  'Stripe Session Check' as check_type,
  order_number,
  stripe_session_id,
  stripe_payment_intent_id,
  payment_gateway,
  payment_method_type,
  created_at
FROM orders
WHERE order_number = 'MYK-20260525-A6F2';

-- 3. Check how the order was created (look for API calls)
-- This order might have been created via Stripe webhook without checkout session
