-- Check if full_name and phone are in checkout_sessions

SELECT 
  'Checkout Session Address Data' as check_type,
  id,
  customer_email,
  guest_shipping_address->>'full_name' as full_name,
  guest_shipping_address->>'phone' as phone,
  guest_shipping_address->>'address_line1' as address_line1,
  guest_shipping_address->>'city' as city,
  guest_shipping_address->>'country' as country,
  created_at
FROM checkout_sessions
WHERE guest_shipping_address IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Also check shipping_address field
SELECT 
  'Shipping Address Field' as check_type,
  id,
  customer_email,
  shipping_address->>'full_name' as full_name,
  shipping_address->>'phone' as phone,
  shipping_address->>'address_line1' as address_line1,
  created_at
FROM checkout_sessions
WHERE shipping_address IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
