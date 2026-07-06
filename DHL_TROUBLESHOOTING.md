# DHL Integration Troubleshooting Guide

## 🔍 Debug Logs Overview

The DHL integration includes comprehensive logging at every step. All logs are output to the server console.

### Log Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DHL API Request [DHL-1234567890]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: https://express.api.dhl.com/mydhlapi/test/shipments
🔧 Method: POST
🔑 Environment: SANDBOX
📦 Headers: {...}
📄 Request Body: {...}
⏰ Timestamp: 2026-05-13T09:50:00.000Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🎯 Which Buttons Trigger DHL API?

### 1. **"Mark as Shipped" Button** (CMS Orders Page)
**Location:** `/app/cms/orders` page  
**Trigger:** When admin clicks "Mark as Shipped" button  
**API Called:** `POST /api/orders/[orderId]/create-shipment`  
**What it does:**
- Creates DHL shipment
- Generates shipping label
- Gets tracking number
- Updates order status to "shipped"
- Saves tracking info to database

**Log Identifier:** `📦 Creating DHL Shipment`

### 2. **Checkout - Get Shipping Rates** (Customer Checkout)
**Location:** `/app/checkout` page  
**Trigger:** When customer enters shipping address  
**API Called:** `POST /api/shipping/dhl/rates`  
**What it does:**
- Calculates real-time shipping costs
- Shows available DHL services
- Displays estimated delivery dates

**Log Identifier:** `🚀 DHL API Request [DHL-...]` with `/rates` endpoint

### 3. **Order Tracking Page** (Customer & Admin)
**Location:** Order details/tracking pages  
**Trigger:** When viewing order with DHL tracking number  
**API Called:** `GET /api/shipping/dhl/tracking?trackingNumber=XXX`  
**What it does:**
- Fetches real-time tracking updates
- Shows delivery status
- Displays shipment events

**Log Identifier:** `🚀 DHL API Request [DHL-...]` with `/tracking` endpoint

## 📋 Complete Log Flow for "Mark as Shipped"

When you click "Mark as Shipped", you'll see these logs in order:

```
1. ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📦 Creating DHL Shipment [SHIP-1234567890]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🆔 Order ID: abc-123
   ⏰ Timestamp: 2026-05-13T09:50:00.000Z

2. 📥 Fetching order details...

3. ✅ Order fetched: {
     orderNumber: "MYK-20260411-F03B",
     itemCount: 2,
     total: 199000,
     currency: "IDR",
     destination: "US"
   }

4. 📍 Shipping Address: {
     name: "John Doe",
     address: "123 Main St",
     city: "New York",
     country: "US",
     postalCode: "10001"
   }

5. 🚚 Service Level: standard → Product Code: N

6. 🔨 Building DHL shipment request...

7. 📋 Shipment Request Summary: {
     productCode: "N",
     isCustomsDeclarable: true,
     packageCount: 1,
     declaredValue: 199000,
     currency: "IDR"
   }

8. 🚀 Calling DHL API to create shipment...

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 DHL API Request [DHL-1234567890]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📍 URL: https://express.api.dhl.com/mydhlapi/test/shipments
   🔧 Method: POST
   🔑 Environment: SANDBOX
   📦 Headers: {...}
   📄 Request Body: {...}
   ⏰ Timestamp: 2026-05-13T09:50:01.000Z
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9. ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ DHL API Response [DHL-1234567890]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 Status: 200 OK
   ⏱️  Duration: 1234ms
   📄 Response Data: {...}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10. ✅ DHL Shipment Created Successfully!
    📦 Tracking Number: JD0123456789
    🔗 Tracking URL: https://www.dhl.com/tracking/...
    📄 Documents: 2

11. 💾 Updating order in database...

12. ✅ Order updated successfully

13. ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ✨ Shipment Creation Complete [SHIP-1234567890]
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🐛 Common Issues and Solutions

### Issue 1: "DHL API credentials not configured"

**Error Log:**
```
💥 DHL API Exception [DHL-...]
⚠️  Error Type: Error
💬 Error Message: DHL API credentials not configured
```

**Solution:**
1. Check your `.env` file has:
   ```env
   DHL_API_KEY=your_key
   DHL_API_SECRET=your_secret
   DHL_ACCOUNT_NUMBER=your_account
   ```
2. Restart your development server
3. Verify credentials are correct from DHL Developer Portal

---

### Issue 2: "401 Unauthorized"

**Error Log:**
```
❌ DHL API Error [DHL-...]
🔴 Status: 401
💬 Message: Unauthorized
```

**Solution:**
1. **Wrong credentials** - Double-check API key and secret
2. **Using production credentials in sandbox** - Make sure you're using sandbox credentials in development
3. **Account not activated** - Verify your DHL account is active

---

### Issue 3: "400 Bad Request - Missing parameters"

**Error Log:**
```
❌ DHL API Error [DHL-...]
🔴 Status: 400
💬 Message: Missing mandatory parameters
📋 Title: Missing parameters
```

**Solution:**
1. Check the request body in logs
2. Verify shipping address is complete:
   - Name
   - Address line 1
   - City
   - Postal code
   - Country code
   - Phone number
3. Check product weights and dimensions are set

---

### Issue 4: "Order not found"

**Error Log:**
```
❌ Order not found: {...}
```

**Solution:**
1. Verify order ID is correct
2. Check order exists in database
3. Ensure order has shipping address

---

### Issue 5: "No shipping address found"

**Error Log:**
```
❌ No shipping address found
```

**Solution:**
1. Order must have a shipping address before creating shipment
2. Check `shipping_addresses` table has entry for this order
3. Verify foreign key relationship is correct

---

### Issue 6: "Shipment already created"

**Error Log:**
```
⚠️  Shipment already exists: JD0123456789
```

**Solution:**
This is not an error - the order already has a DHL shipment. You can:
1. View the existing tracking number
2. Cancel the shipment in DHL if needed
3. Create a new shipment after canceling

---

### Issue 7: "Address validation failed"

**Error Log:**
```
❌ DHL API Error [DHL-...]
💬 Message: Invalid address
```

**Solution:**
1. Verify postal code format is correct for the country
2. Check city name matches postal code
3. Ensure country code is valid ISO 2-letter code (e.g., "US", "ID")
4. Use DHL address validation API before creating shipment

---

### Issue 8: "Package dimensions/weight missing"

**Error Log:**
```
❌ DHL API Error [DHL-...]
💬 Message: Invalid package dimensions
```

**Solution:**
1. Add product weights in CMS:
   - `product_weight` (net weight)
   - `shipping_weight` (gross weight)
2. Add product dimensions:
   - `length`, `width`, `height`
3. Default values are used if missing (30x20x15 cm, 0.5 kg)

## 🔧 How to Enable Debug Mode

The debug logs are always enabled. To view them:

### Development (Local)
```bash
npm run dev
# or
yarn dev
```

Watch the terminal for logs when triggering DHL actions.

### Production (Vercel/Server)
1. Go to your deployment dashboard
2. Navigate to "Logs" or "Runtime Logs"
3. Filter by "DHL" or look for the emoji indicators (🚀, ✅, ❌, 📦)

## 📊 Testing the Integration

### Step 1: Test Credentials
```bash
# Check if credentials are loaded
curl http://localhost:3000/api/shipping/dhl/rates \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "postalCode": "13920",
      "cityName": "Jakarta",
      "countryCode": "ID"
    },
    "destination": {
      "postalCode": "10001",
      "cityName": "New York",
      "countryCode": "US"
    },
    "packages": [{
      "weight": 1,
      "dimensions": {"length": 20, "width": 15, "height": 10}
    }]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "rates": [...]
}
```

### Step 2: Test Shipment Creation
1. Create a test order in CMS
2. Add shipping address
3. Click "Mark as Shipped"
4. Watch server logs for the complete flow

### Step 3: Test Tracking
```bash
curl "http://localhost:3000/api/shipping/dhl/tracking?trackingNumber=JD0123456789"
```

## 📝 Log Emoji Reference

| Emoji | Meaning |
|-------|---------|
| 🚀 | DHL API Request started |
| ✅ | Success |
| ❌ | Error |
| ⚠️  | Warning |
| 💥 | Exception/Crash |
| 📦 | Shipment operation |
| 📍 | Location/Address |
| 🔧 | Configuration |
| 🔑 | Authentication |
| 📄 | Document/Data |
| 💾 | Database operation |
| 🆔 | Identifier |
| ⏰ | Timestamp |
| 📊 | Status |
| ⏱️  | Duration |
| 🚚 | Shipping service |
| 🔨 | Building/Processing |
| 📋 | Summary |
| 💬 | Message |
| 📚 | Stack trace |
| 🔍 | Details |
| ✨ | Complete |

## 🎯 Quick Checklist

Before creating a shipment, verify:

- [ ] DHL credentials are set in `.env`
- [ ] Order has complete shipping address
- [ ] Products have weight and dimensions
- [ ] Order status is "processing" or "pending_payment"
- [ ] No existing DHL shipment for this order
- [ ] Server is running and accessible
- [ ] Database migration 78 is applied

## 📞 Getting Help

If you encounter issues not covered here:

1. **Check server logs** - Look for the detailed error messages
2. **Copy the Request ID** - Each request has a unique ID like `[DHL-1234567890]`
3. **Share the full log block** - Include the request and response logs
4. **Check DHL API status** - Visit https://developer.dhl.com/
5. **Verify account status** - Ensure your DHL account is active

## 🔄 Database Schema Reference

After running migration 78, your `orders` table will have:

```sql
dhl_shipment_number VARCHAR(255)      -- DHL tracking number
dhl_tracking_url TEXT                 -- Customer tracking URL
dhl_label_pdf TEXT                    -- Base64 shipping label
dhl_product_code VARCHAR(10)          -- Service code (P, N, Y)
dhl_service_name VARCHAR(255)         -- Service name
shipped_at TIMESTAMP WITH TIME ZONE   -- Ship timestamp
```

## 🎨 Frontend Integration Example

To trigger shipment creation from your CMS:

```typescript
const handleMarkAsShipped = async (orderId: string) => {
  try {
    const response = await fetch(`/api/orders/${orderId}/create-shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceLevel: 'express' // or 'standard', 'economy'
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Shipment created:', data.shipmentTrackingNumber)
      // Show success message
      // Refresh order list
    } else {
      console.error('❌ Failed:', data.error)
      // Show error message
    }
  } catch (error) {
    console.error('💥 Exception:', error)
  }
}
```
