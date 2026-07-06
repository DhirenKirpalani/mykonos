# DHL Webhook Registration Guide

Complete guide to register your webhook URL with DHL Express API.

## 📋 Prerequisites

1. **DHL API Credentials**
   - API Key (`DHL_API_KEY`)
   - API Secret (`DHL_API_SECRET`)
   - Get from: https://developer.dhl.com

2. **Deployed Application**
   - Your webhook URL must be publicly accessible
   - Example: `https://mykonos.com/api/webhooks/dhl`
   - Must use HTTPS (not HTTP)

3. **Environment Variables**
   ```bash
   DHL_API_KEY=your_api_key
   DHL_API_SECRET=your_api_secret
   WEBHOOK_URL=https://your-domain.com/api/webhooks/dhl
   DHL_WEBHOOK_SECRET=optional_secret_for_verification
   ```

---

## 🎯 Method 1: DHL Developer Portal (Recommended)

### Step 1: Access Developer Portal
1. Go to https://developer.dhl.com
2. Log in with your DHL account
3. Navigate to "My Apps"

### Step 2: Select Your Application
1. Click on your application (the one with your API credentials)
2. Look for "Webhooks" or "Notifications" tab

### Step 3: Add Webhook
1. Click "Add Webhook" or "Create Subscription"
2. Fill in the form:
   - **Name**: Mykonos Order Updates
   - **URL**: `https://your-domain.com/api/webhooks/dhl`
   - **Method**: POST
   - **Active**: ✅ Enabled

### Step 4: Select Events
Check all these events:
- ✅ `shipment.picked-up` - Package picked up by DHL
- ✅ `shipment.in-transit` - Package in transit
- ✅ `shipment.out-for-delivery` - Out for delivery
- ✅ `shipment.delivered` - Successfully delivered
- ✅ `shipment.exception` - Delivery exception/problem
- ✅ `shipment.returned` - Returned to sender

### Step 5: Configure Security (Optional)
- **Secret Key**: Generate or enter a secret
- This will be sent in `x-dhl-signature` header
- Add to your `.env`: `DHL_WEBHOOK_SECRET=your_secret`

### Step 6: Save & Test
1. Click "Save" or "Create"
2. Copy the **Subscription ID** (you'll need this to manage the webhook)
3. Click "Test Webhook" to verify it works

---

## 🚀 Method 2: Using Shell Script

### Quick Setup
```bash
# 1. Make script executable
chmod +x scripts/register-dhl-webhook.sh

# 2. Set your webhook URL in .env
echo "WEBHOOK_URL=https://your-domain.com/api/webhooks/dhl" >> .env.local

# 3. Run the script
./scripts/register-dhl-webhook.sh
```

### Expected Output
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Registering DHL Webhook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Webhook URL: https://mykonos.com/api/webhooks/dhl

📡 Response Status: 201

✅ Webhook registered successfully!

📋 Response:
{
  "subscriptionId": "abc123-def456-ghi789",
  "url": "https://mykonos.com/api/webhooks/dhl",
  "events": [
    "shipment.picked-up",
    "shipment.in-transit",
    "shipment.out-for-delivery",
    "shipment.delivered",
    "shipment.exception",
    "shipment.returned"
  ],
  "status": "active"
}

💡 Save the subscription ID for future reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Done!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 💻 Method 3: Using TypeScript Script

### Run the Script
```bash
# Install dependencies if needed
npm install

# Run the registration script
npx ts-node scripts/register-dhl-webhook.ts
```

### Expected Output
```
🔧 Registering DHL Webhook...
📍 Webhook URL: https://mykonos.com/api/webhooks/dhl
✅ Webhook registered successfully!
📋 Subscription ID: abc123-def456-ghi789
📦 Events: [
  'shipment.picked-up',
  'shipment.in-transit',
  'shipment.out-for-delivery',
  'shipment.delivered',
  'shipment.exception',
  'shipment.returned'
]

💡 Save this subscription ID for future reference

✨ Done!
```

---

## 🔍 Method 4: Manual cURL Request

### Basic Registration
```bash
# Set your credentials
export DHL_API_KEY="your_api_key"
export DHL_API_SECRET="your_api_secret"
export WEBHOOK_URL="https://your-domain.com/api/webhooks/dhl"

# Create Base64 credentials
CREDENTIALS=$(echo -n "$DHL_API_KEY:$DHL_API_SECRET" | base64)

# Register webhook
curl -X POST "https://express.api.dhl.com/mydhlapi/webhooks/v1/subscriptions" \
  -H "Authorization: Basic $CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "'"$WEBHOOK_URL"'",
    "events": [
      "shipment.picked-up",
      "shipment.in-transit",
      "shipment.out-for-delivery",
      "shipment.delivered",
      "shipment.exception",
      "shipment.returned"
    ]
  }'
```

---

## ✅ Verify Registration

### Test Your Webhook
```bash
# Send a test event to your webhook
curl -X POST https://your-domain.com/api/webhooks/dhl \
  -H "Content-Type: application/json" \
  -d '{
    "event": "shipment-delivered",
    "trackingNumber": "TEST123456",
    "timestamp": "2026-05-13T12:00:00Z",
    "description": "Test delivery"
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "orderNumber": "MYK-20260411-9271",
  "event": "shipment-delivered"
}
```

### Check Server Logs
Look for these logs in your application:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 DHL Webhook Received [abc123]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Event Type: shipment-delivered
🔢 Tracking Number: TEST123456
✅ Order found: MYK-20260411-9271
✨ Webhook Processed Successfully [abc123]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔧 Managing Webhooks

### List All Webhooks
```bash
curl -X GET "https://express.api.dhl.com/mydhlapi/webhooks/v1/subscriptions" \
  -H "Authorization: Basic $CREDENTIALS"
```

### Update Webhook
```bash
curl -X PUT "https://express.api.dhl.com/mydhlapi/webhooks/v1/subscriptions/{subscriptionId}" \
  -H "Authorization: Basic $CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://new-domain.com/api/webhooks/dhl",
    "events": ["shipment.delivered"]
  }'
```

### Delete Webhook
```bash
curl -X DELETE "https://express.api.dhl.com/mydhlapi/webhooks/v1/subscriptions/{subscriptionId}" \
  -H "Authorization: Basic $CREDENTIALS"
```

---

## 🐛 Troubleshooting

### Webhook Not Receiving Events

**1. Check URL is Publicly Accessible**
```bash
curl https://your-domain.com/api/webhooks/dhl
# Should return 405 Method Not Allowed (POST is required)
```

**2. Verify HTTPS**
- DHL requires HTTPS (not HTTP)
- Use a valid SSL certificate

**3. Check Firewall**
- Ensure your server allows incoming POST requests
- Whitelist DHL IP ranges if needed

**4. Review Server Logs**
- Check for incoming webhook requests
- Look for errors in processing

### Common Errors

**401 Unauthorized**
- Check your API credentials
- Verify Base64 encoding is correct

**400 Bad Request**
- Check JSON payload format
- Verify event names are correct

**404 Not Found**
- Wrong API endpoint URL
- Check DHL API version

**SSL Certificate Error**
- Use valid SSL certificate
- Avoid self-signed certificates

---

## 📊 Monitoring

### Check Webhook Status
```bash
# Get subscription details
curl -X GET "https://express.api.dhl.com/mydhlapi/webhooks/v1/subscriptions/{subscriptionId}" \
  -H "Authorization: Basic $CREDENTIALS"
```

### View Webhook Logs
Monitor your application logs for:
- Incoming webhook requests
- Processing status
- Email notifications sent
- Database updates

---

## 🔐 Security Best Practices

1. **Use HTTPS Only**
   - Never use HTTP for webhooks
   - Ensure valid SSL certificate

2. **Verify Webhook Signature**
   - Set `DHL_WEBHOOK_SECRET` in environment
   - Implement signature verification in webhook handler

3. **Validate Payload**
   - Check required fields exist
   - Verify tracking numbers match your orders

4. **Rate Limiting**
   - Implement rate limiting on webhook endpoint
   - Prevent abuse

5. **Logging**
   - Log all webhook requests
   - Monitor for suspicious activity

---

## 📝 Notes

- **Sandbox vs Production**: Use different webhook URLs for sandbox and production
- **Subscription ID**: Save this ID to manage your webhook later
- **Event Names**: DHL may use different event name formats (check documentation)
- **Retry Logic**: DHL will retry failed webhooks (implement idempotency)

---

## 🆘 Support

If you encounter issues:
1. Check DHL Developer Portal documentation
2. Review server logs for errors
3. Contact DHL API support
4. Test with sandbox environment first

---

## ✨ Success Checklist

- [ ] Webhook URL is publicly accessible via HTTPS
- [ ] DHL credentials are correct
- [ ] Webhook registered successfully
- [ ] Subscription ID saved
- [ ] Test webhook works
- [ ] Server logs show incoming requests
- [ ] Order status updates automatically
- [ ] Customer emails are sent

**Once all checked, your webhook is ready for production!** 🚀
