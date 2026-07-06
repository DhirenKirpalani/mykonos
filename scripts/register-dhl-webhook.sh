#!/bin/bash

# DHL Webhook Registration Script
# Usage: ./scripts/register-dhl-webhook.sh

# Load environment variables
source .env.local 2>/dev/null || source .env 2>/dev/null

# Configuration
DHL_API_KEY="${DHL_API_KEY}"
DHL_API_SECRET="${DHL_API_SECRET}"
WEBHOOK_URL="${WEBHOOK_URL:-https://your-domain.com/api/webhooks/dhl}"
DHL_WEBHOOK_SECRET="${DHL_WEBHOOK_SECRET:-}"

# Check if credentials are set
if [ -z "$DHL_API_KEY" ] || [ -z "$DHL_API_SECRET" ]; then
    echo "❌ Error: DHL_API_KEY and DHL_API_SECRET must be set in .env"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Registering DHL Webhook"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""

# Create Basic Auth credentials
CREDENTIALS=$(echo -n "$DHL_API_KEY:$DHL_API_SECRET" | base64)

# Register webhook
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://express.api.dhl.com/mydhlapi/webhooks/v1/subscriptions" \
  -H "Authorization: Basic $CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$WEBHOOK_URL\",
    \"events\": [
      \"shipment.picked-up\",
      \"shipment.in-transit\",
      \"shipment.out-for-delivery\",
      \"shipment.delivered\",
      \"shipment.exception\",
      \"shipment.returned\"
    ]
  }")

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📡 Response Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Webhook registered successfully!"
    echo ""
    echo "📋 Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo "💡 Save the subscription ID for future reference"
else
    echo "❌ Failed to register webhook"
    echo ""
    echo "📋 Error Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Done!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
