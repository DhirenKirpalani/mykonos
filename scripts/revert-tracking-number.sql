-- Revert order back to real tracking number
-- Real tracking number: 2518073526
-- Note: Tracking timeline will only work with production DHL API

UPDATE orders 
SET 
  tracking_number = '2518073526',
  tracking_url = 'https://www.dhl.com/track?awb=2518073526',
  dhl_shipment_number = '2518073526'
WHERE order_number = 'MYK-20260411-F038';

-- Verify the update
SELECT 
  order_number,
  tracking_number,
  status,
  created_at
FROM orders 
WHERE order_number = 'MYK-20260411-F038';
