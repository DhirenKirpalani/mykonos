-- Diagnostic Script: Check Shipping Address Capture
-- Run this to diagnose why shipping addresses might not be captured

-- ============================================
-- 1. CHECK DATABASE SCHEMA
-- ============================================
SELECT 
  'Schema Check' as check_type,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'checkout_sessions' 
  AND column_name IN ('guest_shipping_address', 'shipping_address', 'shipping_address_id')
ORDER BY column_name;

-- Expected: guest_shipping_address (jsonb), shipping_address (jsonb), shipping_address_id (uuid)

-- ============================================
-- 2. CHECK RECENT CHECKOUT SESSIONS
-- ============================================
SELECT 
  'Recent Checkout Sessions' as check_type,
  id,
  customer_email,
  guest_shipping_address IS NOT NULL as has_guest_address,
  shipping_address IS NOT NULL as has_shipping_address,
  shipping_address_id IS NOT NULL as has_address_id,
  created_at
FROM checkout_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Expected: At least one of the address fields should be populated

-- ============================================
-- 3. CHECK RECENT ORDERS
-- ============================================
SELECT 
  'Recent Orders' as check_type,
  order_number,
  customer_email,
  shipping_address IS NOT NULL as has_shipping_address,
  status,
  payment_status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- Expected: shipping_address should be NOT NULL for all orders

-- ============================================
-- 4. FIND ORDERS WITH MISSING ADDRESSES
-- ============================================
SELECT 
  'Orders Missing Address' as check_type,
  order_number,
  customer_email,
  status,
  payment_status,
  created_at
FROM orders
WHERE shipping_address IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Expected: Should be empty or very few old orders

-- ============================================
-- 5. JOIN ORDERS WITH CHECKOUT SESSIONS
-- ============================================
SELECT 
  'Order-Session Join' as check_type,
  o.order_number,
  o.customer_email,
  o.shipping_address IS NOT NULL as order_has_address,
  cs.guest_shipping_address IS NOT NULL as session_has_guest_address,
  cs.shipping_address IS NOT NULL as session_has_address,
  o.created_at
FROM orders o
LEFT JOIN checkout_sessions cs ON o.checkout_session_id = cs.id
WHERE o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 10;

-- Expected: If order_has_address is FALSE but session has address, there's a problem

-- ============================================
-- 6. SAMPLE SHIPPING ADDRESS DATA
-- ============================================
SELECT 
  'Sample Address Data' as check_type,
  order_number,
  customer_email,
  shipping_address->>'full_name' as full_name,
  shipping_address->>'address_line1' as address,
  shipping_address->>'city' as city,
  shipping_address->>'country' as country,
  created_at
FROM orders
WHERE shipping_address IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Should show actual address data

-- ============================================
-- 7. CHECK FOR INCOMPLETE CHECKOUTS
-- ============================================
SELECT 
  'Incomplete Checkouts' as check_type,
  id,
  customer_email,
  current_step,
  guest_shipping_address IS NOT NULL as has_address,
  created_at,
  expires_at
FROM checkout_sessions
WHERE guest_shipping_address IS NULL
  AND shipping_address IS NULL
  AND shipping_address_id IS NULL
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: These are abandoned checkouts (users didn't complete address step)

-- ============================================
-- 8. COUNT SUMMARY
-- ============================================
SELECT 
  'Summary Counts' as check_type,
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM orders WHERE shipping_address IS NOT NULL) as orders_with_address,
  (SELECT COUNT(*) FROM orders WHERE shipping_address IS NULL) as orders_without_address,
  (SELECT COUNT(*) FROM checkout_sessions WHERE guest_shipping_address IS NOT NULL) as sessions_with_guest_address,
  (SELECT COUNT(*) FROM checkout_sessions WHERE shipping_address_id IS NOT NULL) as sessions_with_address_id;

-- Expected: orders_with_address should be close to total_orders

-- ============================================
-- 9. RECENT GUEST ORDERS SPECIFICALLY
-- ============================================
SELECT 
  'Recent Guest Orders' as check_type,
  o.order_number,
  o.customer_email,
  o.user_id IS NULL as is_guest,
  o.shipping_address IS NOT NULL as has_address,
  o.shipping_address->>'full_name' as recipient,
  o.created_at
FROM orders o
WHERE o.user_id IS NULL
  AND o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 10;

-- Expected: All guest orders should have shipping_address

-- ============================================
-- 10. CHECK FUNCTION EXISTS
-- ============================================
SELECT 
  'Function Check' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'create_order_before_payment'
  AND routine_schema = 'public';

-- Expected: Should return one row with routine_type = 'FUNCTION'

-- ============================================
-- DIAGNOSTIC COMPLETE
-- ============================================
-- Review the results above to identify the issue:
-- 
-- If Schema Check shows missing columns:
--   → Run migration 81 to add guest_shipping_address
--
-- If Recent Orders show NULL shipping_address:
--   → Check if checkout sessions have the address
--   → If yes, there's a bug in create_order_before_payment
--   → If no, frontend isn't sending the data
--
-- If Order-Session Join shows mismatch:
--   → Session has address but order doesn't = function bug
--   → Neither has address = frontend issue
--
-- If Sample Address Data is empty:
--   → No orders have been completed successfully
--   → Test the checkout flow manually
