-- Verify the create_order_before_payment function logic
-- This will show the actual function code in your database

SELECT 
  routine_name,
  routine_type,
  pg_get_functiondef(p.oid) as function_definition
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_name = 'create_order_before_payment'
  AND r.routine_schema = 'public';

-- This will show you the exact SQL code of the function
-- Look for the line that inserts shipping_address
-- It should be: COALESCE(v_session.guest_shipping_address, v_session.shipping_address)
