# DHL Error: "Unprocessable Entity" - Troubleshooting Guide

## 🔍 What This Error Means

HTTP 422 "Unprocessable Entity" from DHL means the request format is correct, but the **data is invalid or incomplete**.

## 📋 Common Causes & Solutions

### **1. Missing or Invalid Phone Number**

**Error:** Phone number is required or in wrong format

**Check:**
```javascript
// In server console, look for:
📍 Shipping Address: {
  phone: undefined  // ❌ Missing
  // or
  phone: "123"      // ❌ Too short
}
```

**Solution:**
- Phone must be in international format: `+62123456789`
- Minimum 10 digits
- Must include country code

**Fix in database:**
```sql
-- Check if order has phone
SELECT id, order_number, shipping_address->>'phone' as phone 
FROM orders 
WHERE id = 'your-order-id';

-- Update if missing (example)
UPDATE orders 
SET shipping_address = jsonb_set(
  shipping_address, 
  '{phone}', 
  '"+621234567890"'
)
WHERE id = 'your-order-id';
```

---

### **2. Invalid Postal Code Format**

**Error:** Postal code doesn't match country format

**Check:**
```javascript
// Indonesia (ID): 5 digits
postalCode: "13920" ✅
postalCode: "139"   ❌

// USA (US): 5 digits or ZIP+4
postalCode: "10001"      ✅
postalCode: "10001-1234" ✅
postalCode: "100"        ❌
```

**Solution:**
- Verify postal code matches destination country format
- Remove spaces and special characters
- Check DHL serviceability for that postal code

---

### **3. Missing Product Weight or Dimensions**

**Error:** Package weight/dimensions required

**Check server logs:**
```javascript
📋 Shipment Request Summary: {
  packageCount: 1,
  // Check if packages have weight
}

📄 Full Shipment Request: {
  content: {
    packages: [{
      weight: 0,        // ❌ Invalid
      dimensions: {
        length: 0,      // ❌ Invalid
        width: 0,
        height: 0
      }
    }]
  }
}
```

**Solution:**
Add product weights in CMS:
1. Go to Products → Edit Product
2. Navigate to "Shipping" tab
3. Set:
   - **Product Weight**: Net weight (e.g., 0.5 kg)
   - **Shipping Weight**: Gross weight (e.g., 0.6 kg)
   - **Dimensions**: Length × Width × Height (cm)

**Database fix:**
```sql
-- Check product weights
SELECT id, name, product_weight, shipping_weight 
FROM products 
WHERE id IN (
  SELECT product_id FROM order_items WHERE order_id = 'your-order-id'
);

-- Update product weight
UPDATE products 
SET 
  product_weight = 0.5,
  shipping_weight = 0.6,
  length = 20,
  width = 15,
  height = 10
WHERE id = 'product-id';
```

---

### **4. Invalid Email Address**

**Error:** Email format invalid

**Check:**
```javascript
📍 Shipping Address: {
  email: undefined           // ❌ Missing
  email: "invalid-email"     // ❌ No @
  email: "test@"             // ❌ Incomplete
}
```

**Solution:**
- Email must be valid format: `user@domain.com`
- Required for both shipper and receiver

---

### **5. Missing or Invalid Country Code**

**Error:** Country code must be ISO 2-letter code

**Check:**
```javascript
📍 Shipping Address: {
  country: "Indonesia"  // ❌ Wrong (should be "ID")
  country: "USA"        // ❌ Wrong (should be "US")
  country: "ID"         // ✅ Correct
}
```

**Valid country codes:**
- Indonesia: `ID`
- United States: `US`
- Singapore: `SG`
- Malaysia: `MY`
- Thailand: `TH`
- etc.

---

### **6. Missing City Name**

**Error:** City name is required

**Check:**
```javascript
📍 Shipping Address: {
  city: undefined    // ❌ Missing
  city: ""          // ❌ Empty
  city: "Jakarta"   // ✅ Correct
}
```

---

### **7. Invalid Declared Value**

**Error:** Declared value must be positive number

**Check:**
```javascript
📋 Shipment Request Summary: {
  declaredValue: 0        // ❌ Invalid
  declaredValue: -100     // ❌ Negative
  declaredValue: 199000   // ✅ Correct
}
```

---

### **8. Missing Shipper Information**

**Error:** Shipper details incomplete

**Check your `.env` file:**
```env
DHL_SHIPPER_NAME=PT. MONARCH MULTI INDUSTRI
DHL_SHIPPER_ADDRESS=Kawasan Industri Pulogadung...
DHL_SHIPPER_CITY=Jakarta
DHL_SHIPPER_POSTAL_CODE=13920
DHL_SHIPPER_COUNTRY=ID
DHL_SHIPPER_PHONE=+62123456789
DHL_SHIPPER_EMAIL=mykonos.operational@gmail.com
```

All fields must be filled!

---

## 🔧 How to Debug

### **Step 1: Check Server Console**

Look for this in your terminal:

```
📄 Full Shipment Request: {
  "plannedShippingDateAndTime": "2026-05-13T...",
  "productCode": "N",
  "accounts": [...],
  "customerDetails": {
    "shipperDetails": {
      "postalAddress": {
        "postalCode": "13920",  // Check all fields
        "cityName": "Jakarta",
        "countryCode": "ID",
        "addressLine1": "..."
      },
      "contactInformation": {
        "personName": "...",
        "companyName": "...",
        "phoneNumber": "+62...",  // Must be valid
        "emailAddress": "..."     // Must be valid
      }
    },
    "receiverDetails": {
      // Check all receiver fields
    }
  },
  "content": {
    "packages": [{
      "weight": 0.5,  // Must be > 0
      "dimensions": {
        "length": 20,  // Must be > 0
        "width": 15,
        "height": 10
      }
    }],
    "isCustomsDeclarable": true,
    "declaredValue": 199000,  // Must be > 0
    "declaredValueCurrency": "IDR"
  }
}
```

### **Step 2: Check DHL API Response**

Look for the detailed error:

```
❌ DHL API Error [DHL-...]
🔴 Status: 422
💬 Message: Missing mandatory field: phoneNumber
📋 Title: Unprocessable Entity
📝 Full Error: {
  "detail": "Missing mandatory field: phoneNumber",
  "instance": "/expressapi/shipments",
  "title": "Unprocessable Entity",
  "status": "422"
}
```

### **Step 3: Verify Order Data**

Check the order in database:

```sql
SELECT 
  id,
  order_number,
  shipping_address,
  total_amount,
  currency_code
FROM orders 
WHERE id = 'your-order-id';
```

Check the shipping address JSONB:

```sql
SELECT 
  shipping_address->>'name' as name,
  shipping_address->>'phone' as phone,
  shipping_address->>'email' as email,
  shipping_address->>'address' as address,
  shipping_address->>'city' as city,
  shipping_address->>'postal_code' as postal_code,
  shipping_address->>'country' as country
FROM orders 
WHERE id = 'your-order-id';
```

---

## ✅ Quick Checklist

Before creating shipment, verify:

- [ ] **Phone number** exists and is valid (+country code)
- [ ] **Email address** is valid format
- [ ] **Postal code** matches country format
- [ ] **City name** is not empty
- [ ] **Country code** is 2-letter ISO code (ID, US, SG, etc.)
- [ ] **Address line 1** is not empty
- [ ] **Product weight** > 0 (check products table)
- [ ] **Product dimensions** > 0 (length, width, height)
- [ ] **Declared value** > 0
- [ ] **Shipper info** complete in `.env`
- [ ] **DHL credentials** are correct

---

## 🚀 Quick Fix Script

Run this to check your order:

```sql
-- Check order completeness
SELECT 
  o.id,
  o.order_number,
  o.shipping_address->>'name' as customer_name,
  o.shipping_address->>'phone' as phone,
  o.shipping_address->>'email' as email,
  o.shipping_address->>'city' as city,
  o.shipping_address->>'postal_code' as postal_code,
  o.shipping_address->>'country' as country,
  o.total_amount,
  o.currency_code,
  COUNT(oi.id) as item_count,
  MIN(p.product_weight) as min_weight,
  MAX(p.product_weight) as max_weight
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
WHERE o.id = 'your-order-id'
GROUP BY o.id;
```

Look for:
- ❌ NULL values in required fields
- ❌ `min_weight` or `max_weight` = 0 or NULL
- ❌ Invalid phone/email format

---

## 📞 Still Stuck?

1. **Copy the full server log** (from 📦 Creating DHL Shipment to ❌ error)
2. **Copy the "Full Shipment Request" JSON**
3. **Check which field is mentioned in the error message**
4. **Verify that field in your database**

The error message from DHL will tell you exactly which field is the problem!
