# DHL Integration - Quick Start Guide

## ✅ Setup Complete!

The DHL integration is now fully connected to your "Mark as Shipped" button.

## 🚀 How It Works

### **When You Click "Mark as Shipped":**

1. **Validates orders** - Ensures all selected orders are in "Packed" status
2. **Creates DHL shipments** - Calls DHL API for each order
3. **Generates labels** - Gets shipping labels (PDF format)
4. **Gets tracking numbers** - Receives DHL tracking numbers
5. **Updates database** - Saves all shipment info to orders table
6. **Updates status** - Changes order status to "Shipped"

### **What You'll See:**

```
Console Logs:
🚀 Creating DHL shipments for 2 orders
✅ DHL shipment created for order abc-123: JD0123456789
✅ DHL shipment created for order def-456: JD9876543210
📦 Order abc-123 → Tracking: JD0123456789
📦 Order def-456 → Tracking: JD9876543210

Toast Notifications:
✅ Created DHL shipments for 2 order(s)
```

## 📋 Step-by-Step Usage

### **1. Select Orders to Ship**

- Go to CMS → Orders
- Filter by "Packed" status
- Check the boxes next to orders you want to ship
- Or use "Select All" checkbox

### **2. Click "Mark as Shipped"**

- Button is in the top-right bulk actions area
- Button is disabled if:
  - No orders selected
  - Selected orders are not "Packed"

### **3. Watch the Magic Happen**

The system will:
- ✅ Create DHL shipment for each order
- ✅ Generate shipping labels
- ✅ Get tracking numbers
- ✅ Update order status to "Shipped"
- ✅ Save tracking info to database

### **4. View Results**

After completion:
- Orders show "Shipped" status
- Tracking numbers are saved
- Shipping labels are stored (Base64 PDF)
- You can view tracking info in order details

## 🔍 Detailed Logs

Check your server console for detailed logs:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Creating DHL Shipment [SHIP-1715600000000]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 Order ID: MYK-20260411-F03B
⏰ Timestamp: 2026-05-13T09:50:00.000Z

📥 Fetching order details...
✅ Order fetched: {
  orderNumber: "MYK-20260411-F03B",
  itemCount: 2,
  total: 199000,
  destination: "US"
}

📍 Shipping Address: {
  name: "Dhiren Kirpalani",
  city: "New York",
  country: "US"
}

🚚 Service Level: standard → Product Code: N
🔨 Building DHL shipment request...
🚀 Calling DHL API to create shipment...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DHL API Request [DHL-1715600001000]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: https://express.api.dhl.com/mydhlapi/test/shipments
🔧 Method: POST
🔑 Environment: SANDBOX
⏰ Timestamp: 2026-05-13T09:50:01.000Z

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DHL API Response [DHL-1715600001000]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Status: 200 OK
⏱️  Duration: 1234ms

✅ DHL Shipment Created Successfully!
📦 Tracking Number: JD0123456789
🔗 Tracking URL: https://www.dhl.com/tracking/...
📄 Documents: 2

💾 Updating order in database...
✅ Order updated successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Shipment Creation Complete [SHIP-1715600000000]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## ⚠️ Error Handling

If shipment creation fails, you'll see:

```
❌ Failed to create DHL shipment for 1 order(s)
Order abc-123: Invalid shipping address
```

Common errors:
- **Invalid address** - Customer address cannot be validated
- **Missing credentials** - DHL API credentials not configured
- **No shipping address** - Order doesn't have a shipping address
- **Shipment already exists** - Order already has a DHL shipment

## 🔧 Configuration

### **Service Level**

Currently set to "standard" (DHL Express 12:00). To change:

Edit `/app/cms/orders/page.tsx` line 195:

```typescript
body: JSON.stringify({
  serviceLevel: 'express' // Options: 'express', 'standard', 'economy'
}),
```

Service levels map to DHL products:
- `express` → DHL Express Worldwide (P)
- `standard` → DHL Express 12:00 (N)
- `economy` → DHL Economy Select (Y)

## 📊 Database Fields

After shipment creation, these fields are populated:

```sql
dhl_shipment_number    -- DHL tracking number (e.g., JD0123456789)
dhl_tracking_url       -- Customer tracking URL
dhl_label_pdf          -- Base64 encoded shipping label
dhl_product_code       -- Service code (P, N, Y)
dhl_service_name       -- Service name (e.g., "DHL Express Worldwide")
tracking_number        -- Copy of DHL tracking number
tracking_url           -- Copy of DHL tracking URL
status                 -- Updated to "shipped"
shipped_at             -- Timestamp when shipped
```

## 🎯 Next Steps

1. **Test with sandbox** - Try shipping a test order
2. **Check logs** - Verify DHL API is being called
3. **View tracking** - Check if tracking numbers are saved
4. **Download labels** - Verify shipping labels are generated
5. **Go live** - Switch to production when ready

## 📞 Troubleshooting

If the button doesn't trigger DHL API:

1. **Check browser console** - Look for errors
2. **Check server logs** - Look for DHL API calls
3. **Verify credentials** - Ensure `.env` has DHL credentials
4. **Check order status** - Orders must be "Packed"
5. **Check shipping address** - Order must have valid address

See `DHL_TROUBLESHOOTING.md` for detailed troubleshooting guide.

## ✨ Success Indicators

You know it's working when you see:

- ✅ Console logs with emoji indicators (🚀, ✅, 📦)
- ✅ Toast notifications showing success
- ✅ Tracking numbers in order details
- ✅ Order status changes to "Shipped"
- ✅ `shipped_at` timestamp is set

## 🚀 You're All Set!

The DHL integration is now live and connected to your "Mark as Shipped" button!

Try it out:
1. Go to CMS → Orders
2. Select a "Packed" order
3. Click "Mark as Shipped"
4. Watch the console logs! 🎉
