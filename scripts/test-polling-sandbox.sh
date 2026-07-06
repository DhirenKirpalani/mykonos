#!/bin/bash

# Test DHL Polling with Mock Tracking Data
# This script updates an order with a test tracking number and runs the cron job

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing DHL Polling in Sandbox"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load environment variables
source .env.local 2>/dev/null || source .env 2>/dev/null

# Step 1: Update order with test tracking number
echo "📝 Step 1: Updating order with test tracking number..."
echo ""

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Update order via API call
curl -s -X POST "${SUPABASE_URL}/rest/v1/orders?order_number=eq.MYK-20260411-F038" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "tracking_number": "TEST-123456",
    "dhl_shipment_number": "TEST-123456",
    "tracking_url": "https://www.dhl.com/track?awb=TEST-123456",
    "status": "shipped"
  }' > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Order updated with test tracking number: TEST-123456"
else
  echo "❌ Failed to update order"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 2: Running polling cron job..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Run the polling cron job
RESPONSE=$(curl -s -X GET "http://localhost:3001/api/cron/update-tracking" \
  -H "Authorization: Bearer ${CRON_SECRET}")

echo "$RESPONSE" | jq '.'

# Check if successful
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
UPDATED=$(echo "$RESPONSE" | jq -r '.summary.updated')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$SUCCESS" = "true" ] && [ "$UPDATED" -gt 0 ]; then
  echo "✅ Test Successful!"
  echo ""
  echo "📊 Results:"
  echo "   - Orders Updated: $UPDATED"
  echo "   - Order MYK-20260411-F038 should now be 'delivered'"
  echo ""
  echo "🔍 Verify in CMS:"
  echo "   http://localhost:3001/cms/orders"
else
  echo "⚠️  Test completed but no orders were updated"
  echo ""
  echo "💡 This might be normal if:"
  echo "   - Order was already delivered"
  echo "   - No tracking events found"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
