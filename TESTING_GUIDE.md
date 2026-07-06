# DHL Tracking Testing Guide

Complete guide to test webhook and polling functionality.

---

## 🧪 Test 1: Webhook Testing

### **What Are We Testing?**
- Webhook endpoint receives DHL notifications
- Order status updates automatically
- Email notifications sent
- Database updates correctly

### **Prerequisites**
1. ✅ Server running: `npm run dev`
2. ✅ Order with tracking number: `2040430405`
3. ✅ Webhook endpoint: `/api/webhooks/dhl`

### **Run Webhook Tests**

```bash
# Test with your tracking number
./scripts/test-webhook.sh 2040430405

# Or test with default
./scripts/test-webhook.sh
```

### **What Happens**

The script sends 4 webhook events in sequence:

**1. Shipment Picked Up** (2 seconds)
```json
{
  "event": "shipment-picked-up",
  "trackingNumber": "2040430405",
  "description": "Package picked up by DHL"
}
```
**Expected:** Order status → "shipped"

**2. In Transit** (2 seconds)
```json
{
  "event": "shipment-in-transit",
  "trackingNumber": "2040430405",
  "description": "Package in transit"
}
```
**Expected:** Order status stays "shipped"

**3. Out for Delivery** (2 seconds)
```json
{
  "event": "shipment-out-for-delivery",
  "trackingNumber": "2040430405",
  "description": "Out for delivery"
}
```
**Expected:** Order status stays "shipped"

**4. Delivered**
```json
{
  "event": "shipment-delivered",
  "trackingNumber": "2040430405",
  "description": "Package delivered successfully",
  "signedBy": "John Doe"
}
```
**Expected:** Order status → "delivered"

### **Verify Results**

**1. Check Server Logs:**
```
📨 DHL Webhook Received [xxx]
📦 Webhook Payload: {...}
📋 Event Type: shipment-delivered
🔢 Tracking Number: 2040430405
✅ Order found: MYK-20260411-F038
✅ Package delivered
💾 Updating order...
✅ Order updated successfully
📧 Sending email notification...
✅ Email sent successfully
✨ Webhook Processed Successfully
```

**2. Check Database:**
```sql
SELECT 
  order_number,
  status,
  delivered_at,
  updated_at
FROM orders
WHERE tracking_number = '2040430405';
```

**Expected:**
```
order_number: MYK-20260411-F038
status: delivered
delivered_at: 2026-05-15T10:41:00Z
updated_at: 2026-05-15T10:41:00Z
```

**3. Check CMS:**
- Go to: `http://localhost:3000/cms/orders`
- Find order: `MYK-20260411-F038`
- Status badge should show: "Delivered" (green)
- Delivered timestamp should be set

**4. Check Email:**
- Customer should receive delivery confirmation email
- Subject: "✅ Order MYK-XXX Has Been Delivered!"
- Contains tracking number and delivery time

---

## 🔄 Test 2: Polling Cron Job

### **What Are We Testing?**
- Cron job fetches tracking updates from DHL
- Updates order status automatically
- Handles multiple orders
- Logs detailed information

### **Prerequisites**
1. ✅ Server running: `npm run dev`
2. ✅ Orders with tracking numbers in database
3. ✅ Orders in "shipped" status
4. ✅ DHL API credentials configured

### **Run Polling Test**

```bash
# Test the cron job
./scripts/test-polling.sh

# Or manually with curl
curl http://localhost:3000/api/cron/update-tracking
```

### **What Happens**

**1. Cron Job Starts:**
```
🔄 Tracking Update Cron Started [CRON-xxx]
⏰ Time: 2026-05-15T10:40:00Z
```

**2. Fetches Orders:**
```
📦 Found 1 orders to check
```

**3. Checks Each Order:**
```
🔍 Checking MYK-20260411-F038 (2040430405)...
```

**4. Calls DHL API:**
```
🚀 DHL API Request [DHL-xxx]
📍 URL: .../tracking?shipmentTrackingNumber=2040430405
✅ DHL API Response [DHL-xxx]
📊 Status: 200 OK
```

**5. Updates Status:**
```
✅ Order MYK-20260411-F038 is delivered!
💾 Updating order...
✅ Order updated successfully
📧 Sending email notification...
```

**6. Summary:**
```
✨ Cron Job Completed [CRON-xxx]
📊 Summary:
   Total Orders: 1
   ✅ Updated: 1
   ⏭️  Unchanged: 0
   ❌ Failed: 0
   ⏱️  Duration: 1234ms
```

### **Expected Response**

```json
{
  "success": true,
  "message": "Tracking update completed",
  "summary": {
    "total": 1,
    "updated": 1,
    "unchanged": 0,
    "failed": 0,
    "duration": 1234
  }
}
```

### **Verify Results**

**1. Check Response:**
- Status: 200 OK
- success: true
- updated: 1 (or more)

**2. Check Server Logs:**
- Look for "Tracking Update Cron Started"
- Check for "Order XXX is delivered!"
- Verify "Cron Job Completed"

**3. Check Database:**
```sql
-- Check updated orders
SELECT 
  order_number,
  tracking_number,
  status,
  delivered_at,
  updated_at
FROM orders
WHERE status = 'delivered'
AND updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;
```

**4. Check CMS:**
- Refresh orders page
- Status should be updated
- Timestamps should be recent

---

## 📊 Comparison: Webhooks vs Polling

| Feature | Webhooks | Polling |
|---------|----------|---------|
| **Speed** | ⚡ Instant | ⏰ 30min delay |
| **Test Command** | `./scripts/test-webhook.sh` | `./scripts/test-polling.sh` |
| **Trigger** | Manual (test) / DHL (prod) | Manual / Cron (every 30min) |
| **API Calls** | 0 | 1 per order |
| **Best For** | Production | Backup / Testing |

---

## 🎯 Complete Test Workflow

### **Step 1: Create Test Shipment**
```bash
# In CMS, click "Mark as Shipped"
# Get tracking number: 2040430405
```

### **Step 2: Test Webhook**
```bash
# Send test webhook events
./scripts/test-webhook.sh 2040430405

# Check order status changed to "delivered"
```

### **Step 3: Reset Order Status**
```sql
-- Reset for polling test
UPDATE orders
SET status = 'shipped', delivered_at = NULL
WHERE tracking_number = '2040430405';
```

### **Step 4: Test Polling**
```bash
# Run cron job manually
./scripts/test-polling.sh

# Check order status updated again
```

### **Step 5: Verify Everything**
- ✅ Webhook updates work
- ✅ Polling updates work
- ✅ Emails sent correctly
- ✅ Database updated
- ✅ CMS shows correct status

---

## 🔧 Troubleshooting

### **Webhook Not Working**

**Symptoms:**
- No response from webhook endpoint
- Order status not updating
- No logs in console

**Check:**
```bash
# 1. Server running?
curl http://localhost:3000/api/webhooks/dhl

# 2. Tracking number correct?
# Check database for matching tracking number

# 3. Check server logs
# Look for errors in terminal
```

**Solution:**
```bash
# Restart server
npm run dev

# Test webhook again
./scripts/test-webhook.sh 2040430405
```

### **Polling Not Working**

**Symptoms:**
- Cron returns error
- No orders updated
- "No orders to process"

**Check:**
```bash
# 1. Orders exist with tracking numbers?
# Run in database:
SELECT order_number, tracking_number, status
FROM orders
WHERE status IN ('pending_shipment', 'shipped')
AND tracking_number IS NOT NULL;

# 2. DHL API credentials set?
# Check .env file

# 3. Test DHL API directly
curl https://express.api.dhl.com/mydhlapi/test/tracking?shipmentTrackingNumber=2040430405 \
  -H "Authorization: Basic $(echo -n 'KEY:SECRET' | base64)"
```

**Solution:**
```bash
# Check environment variables
echo $DHL_API_KEY
echo $DHL_API_SECRET

# Test polling again
./scripts/test-polling.sh
```

### **Order Not Updating**

**Symptoms:**
- Webhook/polling runs successfully
- But order status doesn't change
- No errors in logs

**Check:**
```sql
-- 1. Order exists?
SELECT * FROM orders WHERE tracking_number = '2040430405';

-- 2. Order in correct status?
-- Should be 'shipped' to update to 'delivered'

-- 3. Check permissions
-- Supabase service key set correctly?
```

**Solution:**
```sql
-- Manually set order to shipped
UPDATE orders
SET status = 'shipped', shipped_at = NOW()
WHERE tracking_number = '2040430405';

-- Test again
```

---

## ✅ Success Checklist

After testing, verify:

### **Webhook Testing:**
- [ ] Webhook endpoint responds (200 OK)
- [ ] Order status updates to "delivered"
- [ ] delivered_at timestamp set
- [ ] Email sent to customer
- [ ] Server logs show webhook processing
- [ ] CMS shows updated status

### **Polling Testing:**
- [ ] Cron job runs successfully (200 OK)
- [ ] Returns summary with counts
- [ ] Order status updates
- [ ] DHL API called for each order
- [ ] Server logs show cron execution
- [ ] Database updated correctly

### **Both Systems:**
- [ ] No errors in console
- [ ] Database updates persist
- [ ] Email notifications work
- [ ] CMS displays correct status
- [ ] Timeline shows shipment info

---

## 🚀 Production Deployment

Once testing is complete:

### **1. Register Real Webhook**
```bash
# Update WEBHOOK_URL in .env to production domain
WEBHOOK_URL=https://your-domain.com/api/webhooks/dhl

# Register with DHL
./scripts/register-dhl-webhook.sh
```

### **2. Verify Cron Schedule**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/update-tracking",
    "schedule": "0,30 * * * *"  // Every 30 minutes
  }]
}
```

### **3. Monitor Logs**
```bash
# Vercel logs
vercel logs --follow

# Look for:
# - Webhook received events
# - Cron job executions
# - Order status updates
```

---

## 📝 Summary

**You now have:**
- ✅ Webhook testing script
- ✅ Polling testing script
- ✅ Complete testing workflow
- ✅ Troubleshooting guide
- ✅ Production deployment steps

**Test both systems to ensure redundancy and reliability!**
