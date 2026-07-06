-- Update an order with test tracking number for polling test
-- This will allow the cron job to fetch mock tracking data

UPDATE orders 
SET 
  tracking_number = 'TEST-123456',
  tracking_url = 'https://www.dhl.com/track?awb=TEST-123456',
  dhl_shipment_number = 'TEST-123456',
  status = 'shipped'
WHERE order_number = 'MYK-20260411-F038';

-- Verify the update
SELECT order_number, status, tracking_number, dhl_shipment_number 
FROM orders 
WHERE order_number = 'MYK-20260411-F038';
