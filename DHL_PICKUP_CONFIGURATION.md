# DHL Auto-Pickup Configuration

## Overview
When DHL Auto-Pickup is enabled, the system automatically requests DHL to pick up packages when creating shipments. This guide explains how to configure pickup details.

## Environment Variables

Add these to your `.env.local` file:

```bash
# DHL Pickup Configuration
DHL_PICKUP_CLOSE_TIME=18:00        # Latest time DHL can pick up (24-hour format)
DHL_PICKUP_LOCATION=reception      # Where packages are ready for pickup
```

### `DHL_PICKUP_CLOSE_TIME`
**Format:** `HH:MM` (24-hour format)  
**Default:** `18:00` (6:00 PM)  
**Description:** The latest time DHL can arrive to pick up packages.

**Examples:**
- `17:00` - 5:00 PM
- `18:00` - 6:00 PM (default)
- `19:30` - 7:30 PM

### `DHL_PICKUP_LOCATION`
**Format:** String  
**Default:** `reception`  
**Description:** Where the packages will be ready for DHL pickup.

**Common Values:**
- `reception` - Front desk/reception area
- `warehouse` - Warehouse/storage area
- `loading dock` - Loading dock area
- `mailroom` - Mail room
- `office` - Office location

## How It Works

### 1. Enable Auto-Pickup in CMS
Go to **CMS → Settings** and enable "DHL Auto-Pickup"

### 2. Create Shipment
When you click "Create DHL Shipment" or "Mark as Shipped", the system will:

```typescript
pickup: {
  isRequested: true,
  closeTime: '18:00',      // From DHL_PICKUP_CLOSE_TIME
  location: 'reception'     // From DHL_PICKUP_LOCATION
}
```

### 3. DHL Schedules Pickup
DHL receives the pickup request with:
- ✅ Pickup address (from shipper details)
- ✅ Close time (when pickup must be completed by)
- ✅ Location (where to find the packages)
- ✅ Planned shipping date

### 4. Courier Arrives
DHL courier will:
1. Come to your address
2. Go to the specified location (e.g., reception)
3. Pick up packages before the close time
4. Scan packages → Events populate in tracking

## API Request Example

When auto-pickup is enabled, the shipment request includes:

```json
{
  "plannedShippingDateAndTime": "2026-05-18T14:30:00 GMT+07:00",
  "pickup": {
    "isRequested": true,
    "closeTime": "18:00",
    "location": "reception"
  },
  "customerDetails": {
    "shipperDetails": {
      "postalAddress": {
        "postalCode": "12345",
        "cityName": "Jakarta",
        "countryCode": "ID",
        "addressLine1": "Jalan Example 123"
      },
      "contactInformation": {
        "fullName": "Mykonos",
        "companyName": "Mykonos Fragrance",
        "phone": "+62123456789",
        "email": "shipping@mykonos.com"
      }
    }
  }
}
```

## Troubleshooting

### Pickup Not Scheduled
**Problem:** Auto-pickup enabled but DHL doesn't come

**Solutions:**
1. **Check Environment Variables**
   ```bash
   DHL_PICKUP_CLOSE_TIME=18:00
   DHL_PICKUP_LOCATION=reception
   ```

2. **Verify Shipper Details**
   Ensure these are set correctly:
   ```bash
   DHL_SHIPPER_ADDRESS=Your full address
   DHL_SHIPPER_CITY=Jakarta
   DHL_SHIPPER_POSTAL_CODE=12345
   DHL_SHIPPER_PHONE=+62123456789
   DHL_SHIPPER_EMAIL=shipping@mykonos.com
   ```

3. **Check DHL Response**
   Look for `cancelPickupUrl` in the shipment response - this confirms pickup was scheduled

4. **Sandbox vs Production**
   - **Sandbox:** Pickup requests are accepted but not executed (test mode)
   - **Production:** Actual courier will be dispatched

### Events Still Empty
**Problem:** Pickup scheduled but `events: []` is still empty

**Reasons:**
1. **Sandbox Environment** - No actual pickup happens in test mode
2. **Courier Not Arrived Yet** - Wait for scheduled pickup time
3. **Package Not Scanned** - Courier needs to physically scan the package

**Timeline:**
```
Label Created → events: []
↓ (wait for pickup)
Courier Arrives → Scans package → events: [{ typeCode: 'PU', ... }]
```

## Best Practices

### 1. Set Realistic Close Time
- Consider your business hours
- Allow buffer time for courier arrival
- Example: If you close at 5 PM, set close time to 4:30 PM

### 2. Prepare Packages
- Have packages ready at the specified location
- Label clearly visible
- Organized and accessible

### 3. Communicate with Staff
- Inform reception/warehouse staff about DHL pickups
- Ensure someone is available at the pickup location
- Keep contact phone number updated

### 4. Monitor Tracking
- Check tracking events after scheduled pickup time
- If no events after 2 hours, contact DHL
- Use the smart alerts in CMS to catch issues

## Testing

### Sandbox Testing
```bash
# Create test shipment with auto-pickup
curl -X POST http://localhost:3000/api/orders/ORDER_ID/create-shipment \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "trackingNumber": "2480261000",
  "trackingUrl": "https://...",
  "cancelPickupUrl": "https://...",  // ← Confirms pickup scheduled
  "shipmentDetails": {
    "pickup": {
      "isRequested": true,
      "closeTime": "18:00",
      "location": "reception"
    }
  }
}
```

### Production Testing
1. Create real shipment with auto-pickup enabled
2. Wait for DHL courier (usually same day or next business day)
3. Verify courier arrives at specified location
4. Check tracking events populate after scan

## Summary

✅ **Auto-pickup enabled** → DHL automatically schedules courier  
✅ **Close time set** → DHL knows when to arrive by  
✅ **Location specified** → Courier knows where to find packages  
✅ **Events populate** → After courier scans the package  

**Result:** Hands-free shipping! Just create the label and DHL handles the rest. 📦🚚
