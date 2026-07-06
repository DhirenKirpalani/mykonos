#!/bin/bash

# Test DHL Webhook Locally
# Usage: ./scripts/test-webhook.sh [tracking_number]

TRACKING_NUMBER=${1:-"2040430405"}
WEBHOOK_URL=${2:-"http://localhost:3000/api/webhooks/dhl"}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing DHL Webhook"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Webhook URL: $WEBHOOK_URL"
echo "🔢 Tracking Number: $TRACKING_NUMBER"
echo ""

# Test 1: Shipment Picked Up
echo "📦 Test 1: Shipment Picked Up"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"shipment-picked-up\",
    \"eventType\": \"PICKUP\",
    \"trackingNumber\": \"$TRACKING_NUMBER\",
    \"shipmentTrackingNumber\": \"$TRACKING_NUMBER\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"description\": \"Package picked up by DHL\",
    \"location\": \"Jakarta, Indonesia\"
  }"
echo ""
echo ""

# Wait 2 seconds
sleep 2

# Test 2: In Transit
echo "🚚 Test 2: In Transit"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"shipment-in-transit\",
    \"eventType\": \"TRANSIT\",
    \"trackingNumber\": \"$TRACKING_NUMBER\",
    \"shipmentTrackingNumber\": \"$TRACKING_NUMBER\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"description\": \"Package in transit\",
    \"location\": \"Jakarta, Indonesia\"
  }"
echo ""
echo ""

# Wait 2 seconds
sleep 2

# Test 3: Out for Delivery
echo "🚛 Test 3: Out for Delivery"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"shipment-out-for-delivery\",
    \"eventType\": \"OUT_FOR_DELIVERY\",
    \"trackingNumber\": \"$TRACKING_NUMBER\",
    \"shipmentTrackingNumber\": \"$TRACKING_NUMBER\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"description\": \"Out for delivery\",
    \"location\": \"Jakarta Selatan, Indonesia\"
  }"
echo ""
echo ""

# Wait 2 seconds
sleep 2

# Test 4: Delivered
echo "✅ Test 4: Delivered"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"shipment-delivered\",
    \"eventType\": \"DELIVERED\",
    \"trackingNumber\": \"$TRACKING_NUMBER\",
    \"shipmentTrackingNumber\": \"$TRACKING_NUMBER\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"description\": \"Package delivered successfully\",
    \"location\": \"Jakarta Selatan, Indonesia\",
    \"signedBy\": \"John Doe\"
  }"
echo ""
echo ""

# Wait 2 seconds
sleep 2

# Test 5: Delivery Attempted
echo "📭 Test 5: Delivery Attempted"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"delivery-attempted\",
    \"eventType\": \"DELIVERY_ATTEMPTED\",
    \"trackingNumber\": \"$TRACKING_NUMBER\",
    \"shipmentTrackingNumber\": \"$TRACKING_NUMBER\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"description\": \"Delivery attempted - no one available\",
    \"location\": \"Jakarta Selatan, Indonesia\",
    \"attemptNumber\": 1,
    \"reason\": \"No one available to receive package\"
  }"
echo ""
echo ""

# Wait 2 seconds
sleep 2

# Test 6: Delayed
echo "⏰ Test 6: Shipment Delayed"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"shipment-delayed\",
    \"eventType\": \"DELAYED\",
    \"trackingNumber\": \"$TRACKING_NUMBER\",
    \"shipmentTrackingNumber\": \"$TRACKING_NUMBER\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"description\": \"Delayed due to weather conditions\",
    \"location\": \"Jakarta, Indonesia\",
    \"estimatedDelivery\": \"$(date -u -v+1d +"%Y-%m-%dT%H:%M:%SZ")\"
  }"
echo ""
echo ""

# Wait 2 seconds
sleep 2

# Test 7: Exception
echo "⚠️  Test 7: Delivery Exception"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"shipment-exception\",
    \"eventType\": \"EXCEPTION\",
    \"trackingNumber\": \"$TRACKING_NUMBER\",
    \"shipmentTrackingNumber\": \"$TRACKING_NUMBER\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"description\": \"Package damaged during transit\",
    \"location\": \"Jakarta Sorting Center, Indonesia\"
  }"
echo ""
echo ""

# Wait 2 seconds
sleep 2

# Test 8: Returned
echo "↩️  Test 8: Package Returned"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"shipment-returned\",
    \"eventType\": \"RETURNED\",
    \"trackingNumber\": \"$TRACKING_NUMBER\",
    \"shipmentTrackingNumber\": \"$TRACKING_NUMBER\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"description\": \"Unable to deliver - returned to sender\",
    \"location\": \"Jakarta, Indonesia\"
  }"
echo ""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Webhook Tests Completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Check your order status in CMS:"
echo "   http://localhost:3000/cms/orders"
echo ""
echo "� Check your email inbox for:"
echo "   1. ✅ Shipment Picked Up"
echo "   2. 🚛 Out for Delivery"
echo "   3. ✅ Delivered"
echo "   4. 📭 Delivery Attempted"
echo "   5. ⏰ Shipment Delayed"
echo "   6. ⚠️  Delivery Exception"
echo "   7. ↩️  Package Returned"
echo ""
echo "💡 All 8 email notifications should be sent!"
