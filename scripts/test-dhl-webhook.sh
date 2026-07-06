#!/bin/bash

# Mock DHL Webhook Testing Script
# Simulates DHL webhook events for testing
#
# Usage:
#   ./scripts/test-dhl-webhook.sh [event] [tracking-number]
#
# Events:
#   picked-up, transit, out-for-delivery, delivered, exception, returned
#
# Examples:
#   ./scripts/test-dhl-webhook.sh delivered 2518074510
#   ./scripts/test-dhl-webhook.sh picked-up 2518074510

# Configuration
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/webhooks/dhl}"
EVENT="${1:-delivered}"
TRACKING_NUMBER="${2:-2518074510}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Mock DHL Webhook Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📍 Webhook URL:${NC} $WEBHOOK_URL"
echo -e "${BLUE}📦 Event:${NC} $EVENT"
echo -e "${BLUE}🔢 Tracking Number:${NC} $TRACKING_NUMBER"
echo ""

# Create payload based on event type
case "$EVENT" in
  "picked-up")
    PAYLOAD=$(cat <<EOF
{
  "event": "shipment-picked-up",
  "trackingNumber": "$TRACKING_NUMBER",
  "timestamp": "$TIMESTAMP",
  "description": "Shipment has been picked up",
  "location": "Jakarta Distribution Center",
  "nextSteps": "Package is being processed for transit"
}
EOF
)
    ;;
    
  "transit")
    PAYLOAD=$(cat <<EOF
{
  "event": "shipment-in-transit",
  "trackingNumber": "$TRACKING_NUMBER",
  "timestamp": "$TIMESTAMP",
  "description": "Shipment is in transit",
  "location": "Jakarta Sorting Facility",
  "nextSteps": "Package will be delivered soon"
}
EOF
)
    ;;
    
  "out-for-delivery")
    PAYLOAD=$(cat <<EOF
{
  "event": "shipment-out-for-delivery",
  "trackingNumber": "$TRACKING_NUMBER",
  "timestamp": "$TIMESTAMP",
  "description": "Shipment is out for delivery",
  "location": "Jakarta Pusat Delivery Hub",
  "courierName": "Ahmad Rizki",
  "estimatedDelivery": "$(date -u -v+2H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d '+2 hours' +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)
    ;;
    
  "delivered")
    PAYLOAD=$(cat <<EOF
{
  "event": "shipment-delivered",
  "trackingNumber": "$TRACKING_NUMBER",
  "timestamp": "$TIMESTAMP",
  "description": "Shipment has been delivered",
  "location": "Customer Address",
  "signedBy": "Customer",
  "deliveryProof": "Signature received",
  "deliveredAt": "$TIMESTAMP"
}
EOF
)
    ;;
    
  "exception")
    PAYLOAD=$(cat <<EOF
{
  "event": "shipment-exception",
  "trackingNumber": "$TRACKING_NUMBER",
  "timestamp": "$TIMESTAMP",
  "description": "Delivery exception occurred",
  "exceptionCode": "ADDRESS_ISSUE",
  "exceptionReason": "Customer not available",
  "nextAttempt": "$(date -u -v+1d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d '+1 day' +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)
    ;;
    
  "returned")
    PAYLOAD=$(cat <<EOF
{
  "event": "shipment-returned",
  "trackingNumber": "$TRACKING_NUMBER",
  "timestamp": "$TIMESTAMP",
  "description": "Shipment is being returned to sender",
  "returnReason": "Customer refused delivery",
  "returnLocation": "Jakarta Distribution Center"
}
EOF
)
    ;;
    
  *)
    echo -e "${RED}❌ Invalid event type: $EVENT${NC}"
    echo ""
    echo "Available events:"
    echo "  - picked-up"
    echo "  - transit"
    echo "  - out-for-delivery"
    echo "  - delivered"
    echo "  - exception"
    echo "  - returned"
    echo ""
    exit 1
    ;;
esac

echo "📋 Payload:"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"
echo ""

# Send webhook
echo "📤 Sending webhook..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-dhl-signature: mock-signature-for-testing" \
  -d "$PAYLOAD")

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Response"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Status:${NC} $HTTP_CODE"
echo ""
echo "Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Webhook sent successfully!${NC}"
    echo ""
    echo "💡 Check your:"
    echo "   - Server logs for webhook processing"
    echo "   - Database for order status updates"
    echo "   - Email inbox for notifications"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${RED}❌ Webhook endpoint not found!${NC}"
    echo ""
    echo "💡 Make sure:"
    echo "   - Your server is running: npm run dev"
    echo "   - The webhook route exists: /app/api/webhooks/dhl/route.ts"
else
    echo -e "${YELLOW}⚠️  Webhook failed with status $HTTP_CODE${NC}"
    echo ""
    echo "Check your server logs for errors"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Done!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
