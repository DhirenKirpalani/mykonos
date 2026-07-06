#!/bin/bash

# Test DHL Polling Cron Job
# Usage: ./scripts/test-polling.sh

CRON_URL=${1:-"http://localhost:3000/api/cron/update-tracking"}
CRON_SECRET=${CRON_SECRET:-""}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Testing DHL Polling Cron Job"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Cron URL: $CRON_URL"
echo "⏰ Timestamp: $(date)"
echo ""

# Build curl command
if [ -n "$CRON_SECRET" ]; then
  echo "🔐 Using CRON_SECRET for authentication"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$CRON_URL" \
    -H "Authorization: Bearer $CRON_SECRET")
else
  echo "⚠️  No CRON_SECRET set (running without auth)"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$CRON_URL")
fi

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Response"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Status: $HTTP_CODE"
echo ""
echo "Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Cron job executed successfully!"
  echo ""
  
  # Parse summary
  TOTAL=$(echo "$BODY" | jq -r '.summary.total' 2>/dev/null)
  UPDATED=$(echo "$BODY" | jq -r '.summary.updated' 2>/dev/null)
  UNCHANGED=$(echo "$BODY" | jq -r '.summary.unchanged' 2>/dev/null)
  FAILED=$(echo "$BODY" | jq -r '.summary.failed' 2>/dev/null)
  DURATION=$(echo "$BODY" | jq -r '.summary.duration' 2>/dev/null)
  
  if [ "$TOTAL" != "null" ]; then
    echo "📊 Summary:"
    echo "   Total Orders Checked: $TOTAL"
    echo "   ✅ Updated: $UPDATED"
    echo "   ⏭️  Unchanged: $UNCHANGED"
    echo "   ❌ Failed: $FAILED"
    echo "   ⏱️  Duration: ${DURATION}ms"
  fi
else
  echo "❌ Cron job failed!"
  echo ""
  echo "💡 Troubleshooting:"
  echo "   1. Check if server is running (npm run dev)"
  echo "   2. Check DHL API credentials in .env"
  echo "   3. Check if orders have tracking numbers"
  echo "   4. Check server logs for errors"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Test Completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Check your orders in CMS:"
echo "   http://localhost:3000/cms/orders"
echo ""
echo "📝 Check server logs for detailed output"
