#!/bin/bash

# Test DHL API Authentication
# Usage: ./scripts/test-dhl-auth.sh

# Load environment variables
source .env.local 2>/dev/null || source .env 2>/dev/null

API_KEY="${DHL_API_KEY}"
API_SECRET="${DHL_API_SECRET}"

if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
    echo "❌ Error: DHL_API_KEY and DHL_API_SECRET must be set in .env"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Testing DHL API Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Encode credentials
CREDENTIALS=$(echo -n "$API_KEY:$API_SECRET" | base64)

echo "📋 Credentials Info:"
echo "   API Key: ${API_KEY:0:10}... (masked)"
echo "   API Secret: ${API_SECRET:0:10}... (masked)"
echo "   Base64: ${CREDENTIALS:0:20}... (masked)"
echo ""

# Test with a simple tracking request
TRACKING_NUMBER="2040430405"
URL="https://express.api.dhl.com/mydhlapi/test/tracking?shipmentTrackingNumber=$TRACKING_NUMBER"

echo "🚀 Testing API Request:"
echo "   URL: $URL"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "$URL" \
  -H "Authorization: Basic $CREDENTIALS" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Response"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Authentication Successful!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo "❌ Authentication Failed!"
    echo ""
    echo "Error: Invalid credentials"
    echo "Please check your DHL_API_KEY and DHL_API_SECRET in .env"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo "⚠️  Authentication OK, but tracking number not found"
    echo ""
    echo "This means your credentials are valid!"
    echo "The tracking number just doesn't exist in the system."
else
    echo "⚠️  Unexpected Response"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
