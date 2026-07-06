# Test Shipment Creation Guide

Quick guide to create your own test DHL shipment.

---

## 🎯 Goal

Create a real DHL shipment through your CMS to get a unique tracking number for testing.

---

## 📋 Prerequisites

1. ✅ Order exists in database
2. ✅ Order has shipping address
3. ✅ Order status is `paid` or `pending_shipment`
4. ✅ DHL API credentials configured in `.env`

---

## 🚀 Steps

### **Step 1: Go to CMS Orders**

```
http://localhost:3000/cms/orders
```

### **Step 2: Find Your Test Order**

Look for order: `MYK-20260411-F038` (or any paid order)

### **Step 3: Click "Mark as Shipped"**

1. Click the order to expand details
2. Find the "Mark as Shipped" button
3. Click it

### **Step 4: Watch the Process**

**Console logs will show:**
```
📦 Creating DHL Shipment [SHIP-1778840...]
🆔 Order ID: xxx
📥 Fetching order details...
✅ Order found: MYK-20260411-F038
📦 Creating DHL shipment request...
🚀 Calling DHL API...
✅ Shipment created successfully!
📋 Tracking Number: [NEW NUMBER]
💾 Updating order...
✅ Order updated
📧 Sending shipping notification...
✨ Shipment Created Successfully
```

### **Step 5: Get Your Tracking Number**

**The response will include:**
```json
{
  "success": true,
  "trackingNumber": "1234567890",  // Your NEW tracking number
  "trackingUrl": "https://www.dhl.com/track?awb=1234567890",
  "labelUrl": "data:application/pdf;base64,..."
}
```

### **Step 6: Test the Tracking**

1. Copy the new tracking number
2. Click "Refresh Tracking" in CMS
3. See your shipment details!

---

## 🔍 What Gets Created

**In DHL System:**
- ✅ New shipment record
- ✅ Unique tracking number
- ✅ Shipping label (PDF)
- ✅ Tracking URL

**In Your Database:**
- ✅ `tracking_number` updated
- ✅ `tracking_url` updated
- ✅ `dhl_shipment_number` updated
- ✅ `dhl_label_pdf` saved (Base64)
- ✅ `status` → "shipped"
- ✅ `shipped_at` timestamp

**Email Sent:**
- ✅ Shipping notification to customer
- ✅ Includes tracking number
- ✅ Includes tracking link

---

## 🧪 Test Scenarios

### **Scenario 1: Single Order**
```
1. Click "Mark as Shipped" on one order
2. Wait for success message
3. Check tracking number in order details
4. Click "Refresh Tracking"
5. See shipment timeline
```

### **Scenario 2: Bulk Shipment**
```
1. Select multiple orders (checkbox)
2. Click "Mark Selected as Shipped"
3. Wait for all to complete
4. Check each order's tracking number
```

---

## ⚠️ Important Notes

### **Sandbox vs Production**

**Currently Using:** Sandbox (test environment)
- ✅ Safe for testing
- ✅ No real shipments
- ✅ No charges
- ⚠️ Tracking may not update (no physical pickup)

**What This Means:**
- Shipment is created in DHL's test system
- You get a real tracking number
- But no physical package is shipped
- Tracking events won't update (no pickup)

### **Expected Behavior**

**After Creating Shipment:**
```
Status: Success
Events: [] (empty - no pickup yet)
Description: Your product description
Route: Your actual route
```

**This is NORMAL for sandbox!**
- Shipment created ✅
- Tracking number assigned ✅
- No physical pickup ⏳
- No tracking events ⏳

---

## 🔧 Troubleshooting

### **"Mark as Shipped" Button Not Working**

**Check:**
1. Order status is `paid` or `pending_shipment`
2. Order has shipping address
3. DHL credentials in `.env`
4. Check browser console for errors

**Solution:**
```bash
# Check logs
npm run dev

# Look for errors in terminal
```

### **"Failed to Create Shipment"**

**Common Issues:**
1. ❌ Missing shipping address
2. ❌ Invalid address format
3. ❌ Missing DHL credentials
4. ❌ Address line too long (>45 chars)

**Solution:**
```sql
-- Check order has address
SELECT order_number, shipping_address
FROM orders
WHERE id = 'your-order-id';

-- Update if needed
UPDATE orders
SET shipping_address = '{
  "name": "Test Customer",
  "phone": "+6281234567890",
  "address_line_1": "Jl. Test No. 123",
  "city": "Jakarta",
  "postal_code": "12345",
  "country": "ID"
}'::jsonb
WHERE id = 'your-order-id';
```

### **Tracking Number Not Showing**

**Check:**
1. Database updated?
2. Refresh the page
3. Check order details in database

**Solution:**
```sql
-- Check tracking number
SELECT order_number, tracking_number, tracking_url, status
FROM orders
WHERE order_number = 'MYK-20260411-F038';
```

---

## ✅ Success Checklist

After creating shipment, verify:

- [ ] Order status changed to "shipped"
- [ ] Tracking number appears in order details
- [ ] Tracking URL is clickable
- [ ] "Refresh Tracking" button appears
- [ ] Clicking refresh shows shipment info
- [ ] Email sent to customer
- [ ] Shipping label available (Download Label button)

---

## 🎯 Next Steps

**After Creating Your Test Shipment:**

1. **Test Tracking Timeline:**
   - Click "Refresh Tracking"
   - See shipment information
   - Note: Events will be empty (sandbox)

2. **Test Webhooks:**
   - Register webhook with DHL
   - Simulate webhook events
   - See status updates

3. **Test Polling:**
   - Wait 30 minutes
   - Cron job runs automatically
   - Check if status updates

---

## 📝 Example Order Data

**Minimum Required:**
```json
{
  "order_number": "MYK-20260411-F038",
  "status": "paid",
  "total_amount": 199000,
  "customer_email": "test@example.com",
  "shipping_address": {
    "name": "Test Customer",
    "phone": "+6281234567890",
    "address_line_1": "Jl. Sudirman No. 123",
    "city": "Jakarta",
    "postal_code": "12190",
    "country": "ID"
  },
  "items": [
    {
      "product_name": "Coconut Dreams",
      "quantity": 1,
      "price": 199000
    }
  ]
}
```

---

## 🚀 Ready to Test!

**Just click "Mark as Shipped" and you'll get your own unique tracking number for testing!**
