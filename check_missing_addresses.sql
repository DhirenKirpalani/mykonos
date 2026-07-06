-- Quick check for orders with missing shipping addresses

-- 1. Count orders with and without addresses
SELECT 
  'Address Summary' as check_type,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN shipping_address IS NOT NULL THEN 1 END) as with_address,
  COUNT(CASE WHEN shipping_address IS NULL THEN 1 END) as without_address,
  ROUND(COUNT(CASE WHEN shipping_address IS NOT NULL THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as percent_with_address
FROM orders;

-- 2. Show recent orders with their address status
SELECT 
  'Recent Orders' as check_type,
  order_number,
  customer_email,
  CASE 
    WHEN shipping_address IS NOT NULL THEN '✅ Has Address'
    ELSE '❌ Missing Address'
  END as address_status,
  status,
  payment_status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 20;

-- 3. If there are missing addresses, check the checkout sessions
SELECT 
  'Missing Address Analysis' as check_type,
  o.order_number,
  o.customer_email,
  o.shipping_address IS NULL as order_missing_address,
  cs.guest_shipping_address IS NOT NULL as session_has_guest_address,
  cs.shipping_address IS NOT NULL as session_has_address,
  cs.shipping_address_id IS NOT NULL as session_has_address_id,
  o.created_at
FROM orders o
LEFT JOIN checkout_sessions cs ON o.checkout_session_id = cs.id
WHERE o.shipping_address IS NULL
ORDER BY o.created_at DESC
LIMIT 10;

-- 4. Sample of actual shipping address data (to verify format)
SELECT 
  'Sample Address Data' as check_type,
  order_number,
  shipping_address->>'full_name' as full_name,
  shipping_address->>'phone' as phone,
  shipping_address->>'address_line1' as address_line1,
  shipping_address->>'city' as city,
  shipping_address->>'state_province' as state_province,
  shipping_address->>'postal_code' as postal_code,
  shipping_address->>'country' as country,
  created_at
FROM orders
WHERE shipping_address IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
