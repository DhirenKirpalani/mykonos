# DHL Test Tracking Numbers - Mock Data

Since DHL's sandbox doesn't have reliable test data, we've created a **mock tracking endpoint** for testing.

## 📦 Mock Tracking Numbers

Any tracking number starting with **`TEST`** or **`7777`** will use mock data instead of calling the real DHL API.

### Recommended Test Numbers:

### 1. **TEST-123456** (Recommended)
- **Status**: Delivered
- **Route**: Complete delivery journey
- **Events**: 5 tracking events with timestamps
- **Use for**: Testing complete delivery flow

### 2. **7777777770**
- **Status**: Delivered  
- **Route**: Same as TEST-123456
- **Use for**: Alternative test number

### 3. **TEST-TRANSIT**
- **Status**: In Transit
- **Use for**: Testing active shipments

## 🎭 Mock Data Features

The mock endpoint returns:
- ✅ Realistic tracking events
- ✅ Timestamps (relative to current time)
- ✅ Location information
- ✅ Delivery signature
- ✅ Estimated delivery date
- ✅ Complete shipment details

## 🧪 How to Test

### Step 1: Update Order with Test Tracking Number

Run the SQL script:
```bash
# Using Supabase CLI
supabase db execute -f scripts/update-test-tracking.sql

# Or run directly in Supabase Dashboard SQL Editor
```

### Step 2: Test in CMS

1. Go to CMS Orders page: `http://localhost:3000/cms/orders`
2. Find order `MYK-20260411-F038`
3. Click to expand the order
4. Click **"Refresh Tracking"** button
5. Watch the timeline appear!

### Step 3: Expected Result

You should see:
```
📦 Shipment Timeline
├─ ✓ Delivered                          May 6, 10:00 AM
│   Leipzig, Germany
│   Signed by: John Doe
│
├─ ✓ Out for delivery                   May 6, 08:30 AM
│   Leipzig, Germany
│
├─ ✓ Arrived at destination             May 5, 11:00 PM
│   Leipzig, Germany
│
├─ ✓ In transit                         May 5, 02:00 PM
│   Brussels, Belgium
│
└─ ✓ Shipment picked up                 May 5, 09:00 AM
    Brussels, Belgium

Estimated Delivery: May 6, 2026
```

## 🔄 Switch Back to Real Tracking

When done testing, update back to real tracking number:
```sql
UPDATE orders 
SET 
  tracking_number = '2518073526',
  tracking_url = 'https://www.dhl.com/track?awb=2518073526',
  dhl_shipment_number = '2518073526'
WHERE order_number = 'MYK-20260411-F038';
```

## 📝 Notes

- Test tracking numbers only work in **SANDBOX** environment
- Real tracking numbers only work in **PRODUCTION** environment
- The timeline will gracefully hide if tracking fails
- No error messages shown to user if tracking not found

## 🚀 For Production

When ready to go live:
1. Update `.env` to use production DHL API
2. Use real tracking numbers from actual shipments
3. Timeline will show real tracking events
