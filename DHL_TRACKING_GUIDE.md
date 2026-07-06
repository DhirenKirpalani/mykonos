# DHL Tracking Integration Guide

Complete guide for DHL tracking updates via webhooks and polling.

---

## 📋 Table of Contents

1. [Webhook Setup (Recommended)](#webhook-setup)
2. [Polling Setup (Backup)](#polling-setup)
3. [Comparison](#comparison)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Option 1: Webhook Setup (Recommended)

### **What Are Webhooks?**

DHL sends real-time notifications to your server when shipment status changes.

```
DHL System → Your API → Database Update → Email Notification
```

### **Advantages:**
- ✅ Real-time updates (instant)
- ✅ No API rate limits
- ✅ Lower server load
- ✅ More reliable
- ✅ Industry standard

### **Setup Steps:**

#### **1. Configure Environment Variables**

Add to `.env` or `.env.local`:
```env
# DHL API Credentials
DHL_API_KEY=your_api_key
DHL_API_SECRET=your_api_secret

# Webhook Configuration
WEBHOOK_URL=https://your-domain.com/api/webhooks/dhl
DHL_WEBHOOK_SECRET=your_random_secret_key

# Optional: Cron Secret (for polling backup)
CRON_SECRET=your_cron_secret
```

#### **2. Register Webhook with DHL**

Run the registration script:
```bash
chmod +x scripts/register-dhl-webhook.sh
./scripts/register-dhl-webhook.sh
```

Or manually via API:
```bash
curl -X POST https://express.api.dhl.com/mydhlapi/webhooks/v1/subscriptions \
  -H "Authorization: Basic $(echo -n 'API_KEY:API_SECRET' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/webhooks/dhl",
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

#### **3. Webhook Endpoint**

Already implemented at: `/app/api/webhooks/dhl/route.ts`

**Features:**
- ✅ Receives DHL notifications
- ✅ Updates order status
- ✅ Sends email notifications
- ✅ Logs all events
- ✅ Error handling

**Supported Events:**
| Event | Action | Email |
|-------|--------|-------|
| `shipment-picked-up` | Status → "shipped" | ✅ Shipped email |
| `shipment-in-transit` | Status → "shipped" | ❌ |
| `shipment-out-for-delivery` | Status → "shipped" | ❌ |
| `shipment-delivered` | Status → "delivered" | ✅ Delivered email |
| `shipment-exception` | Add notes | ✅ Exception email |
| `shipment-returned` | Status → "cancelled" | ❌ |

#### **4. Test Webhook**

Test locally with ngrok:
```bash
# Start ngrok
ngrok http 3000

# Update WEBHOOK_URL in .env
WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/webhooks/dhl

# Re-register webhook
./scripts/register-dhl-webhook.sh
```

Send test webhook:
```bash
curl -X POST http://localhost:3000/api/webhooks/dhl \
  -H "Content-Type: application/json" \
  -d '{
    "event": "shipment-delivered",
    "trackingNumber": "2518073526",
    "timestamp": "2026-05-15T10:30:00Z",
    "description": "Package delivered"
  }'
```

---

## 🔄 Option 2: Polling Setup (Backup)

### **What Is Polling?**

Your server periodically checks DHL API for status updates.

```
Cron Job (every 30min) → DHL API → Database Update → Email
```

### **Advantages:**
- ✅ Works without webhooks
- ✅ Backup if webhooks fail
- ✅ Full control over timing
- ✅ Can retry failed requests

### **Disadvantages:**
- ❌ Delayed updates (30min intervals)
- ❌ Uses API rate limits
- ❌ Higher server load
- ❌ More API calls

### **Setup Steps:**

#### **1. Cron Job Already Configured**

File: `/app/api/cron/update-tracking/route.ts`

**Features:**
- ✅ Checks up to 50 orders per run
- ✅ Updates "shipped" and "delivered" status
- ✅ Sends email notifications
- ✅ Rate limiting (100ms between requests)
- ✅ Detailed logging

#### **2. Vercel Cron Configuration**

Already added to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-tracking",
      "schedule": "0,30 * * * *"
    }
  ]
}
```

**Schedule:** Every 30 minutes (at :00 and :30)

#### **3. Manual Trigger**

Test the cron job manually:
```bash
# Local testing
curl http://localhost:3000/api/cron/update-tracking

# Production (with secret)
curl https://your-domain.com/api/cron/update-tracking \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### **4. Monitor Logs**

Check Vercel logs for cron execution:
```bash
vercel logs --follow
```

Look for:
```
🔄 Tracking Update Cron Started
📦 Found X orders to check
✅ Order MYK-XXX is delivered!
✨ Cron Job Completed
```

---

## ⚖️ Comparison

| Feature | Webhooks | Polling |
|---------|----------|---------|
| **Speed** | Instant | 30min delay |
| **Reliability** | High | Medium |
| **API Calls** | 0 | 50 per run |
| **Server Load** | Low | Medium |
| **Setup Complexity** | Medium | Easy |
| **Cost** | Free | API limits |
| **Best For** | Production | Backup/Testing |

---

## 🎯 Recommended Setup

**Use Both!**

1. **Primary:** Webhooks for real-time updates
2. **Backup:** Polling every 30min to catch missed webhooks

This ensures:
- ✅ Real-time updates (webhooks)
- ✅ No missed updates (polling backup)
- ✅ Redundancy if webhooks fail
- ✅ Best of both worlds

---

## 🧪 Testing

### **Test Webhook:**
```bash
# 1. Create test order with tracking number
# 2. Send test webhook
curl -X POST http://localhost:3000/api/webhooks/dhl \
  -H "Content-Type: application/json" \
  -d '{
    "event": "shipment-delivered",
    "trackingNumber": "2518073526",
    "timestamp": "2026-05-15T10:30:00Z"
  }'

# 3. Check order status in database
# 4. Check email inbox
```

### **Test Polling:**
```bash
# 1. Create order with tracking number
# 2. Trigger cron manually
curl http://localhost:3000/api/cron/update-tracking

# 3. Check logs for updates
# 4. Verify order status changed
```

---

## 🔧 Troubleshooting

### **Webhooks Not Received**

**Check:**
1. ✅ Webhook registered with DHL
2. ✅ WEBHOOK_URL is publicly accessible
3. ✅ No firewall blocking requests
4. ✅ Endpoint returns 200 OK
5. ✅ Check Vercel logs for incoming requests

**Solution:**
```bash
# Re-register webhook
./scripts/register-dhl-webhook.sh

# Test with ngrok
ngrok http 3000
```

### **Polling Not Working**

**Check:**
1. ✅ Cron job configured in vercel.json
2. ✅ DHL API credentials correct
3. ✅ Orders have tracking numbers
4. ✅ Orders in "shipped" status
5. ✅ Check Vercel cron logs

**Solution:**
```bash
# Test manually
curl http://localhost:3000/api/cron/update-tracking

# Check logs
vercel logs --follow
```

### **Status Not Updating**

**Check:**
1. ✅ Tracking number correct
2. ✅ DHL API has tracking data
3. ✅ Events array not empty
4. ✅ Database permissions
5. ✅ Supabase service key set

**Solution:**
```bash
# Test tracking API directly
curl https://express.api.dhl.com/mydhlapi/test/tracking?shipmentTrackingNumber=2518073526 \
  -H "Authorization: Basic $(echo -n 'KEY:SECRET' | base64)"
```

---

## 📊 Monitoring

### **Webhook Metrics:**
- Check Vercel logs for webhook calls
- Monitor response times
- Track success/failure rates

### **Polling Metrics:**
- Check cron execution logs
- Monitor API rate limits
- Track update success rates

### **Database Queries:**
```sql
-- Orders awaiting tracking updates
SELECT order_number, tracking_number, status, updated_at
FROM orders
WHERE status IN ('pending_shipment', 'shipped')
AND tracking_number IS NOT NULL
ORDER BY updated_at ASC;

-- Recently delivered orders
SELECT order_number, delivered_at, customer_email
FROM orders
WHERE status = 'delivered'
AND delivered_at > NOW() - INTERVAL '24 hours'
ORDER BY delivered_at DESC;
```

---

## 🚀 Production Checklist

- [ ] DHL API credentials configured
- [ ] Webhook registered with DHL
- [ ] Webhook endpoint tested
- [ ] Polling cron job configured
- [ ] Email notifications working
- [ ] Error logging enabled
- [ ] Monitoring dashboard set up
- [ ] Backup strategy in place

---

## 📝 Summary

**You have two options:**

1. **Webhooks (Recommended):**
   - Real-time updates
   - Already implemented
   - Just register with DHL

2. **Polling (Backup):**
   - Every 30 minutes
   - Already configured
   - Automatic on Vercel

**Best Practice:** Use both for maximum reliability!
