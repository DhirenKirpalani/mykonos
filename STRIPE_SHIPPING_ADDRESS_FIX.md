# 🚨 CRITICAL: Stripe Orders Missing Shipping Address

## Problem Identified

**Orders created via Stripe checkout have `shipping_address: null`**

### Example Order
```json
{
  "order_number": "MYK-20260525-A6F2",
  "shipping_address": null,  // ❌ MISSING!
  "checkout_session_id": null,  // ❌ ALSO NULL!
  "stripe_session_id": "cs_test_a1j2YsRP2EIpTaimLaiJ33JnPyYTFRjm02OBtqjo9paujowiYDbx3xUfa4",
  "payment_gateway": "stripe"
}
```

---

## Root Cause

The checkout flow for Stripe is:

1. ✅ User selects shipping address
2. ✅ Create checkout session (but shipping address NOT saved yet)
3. ✅ Create order with `checkout_session_id`
4. ❌ **Redirect to Stripe** (shipping address never saved!)
5. ❌ Order has NULL shipping_address

**The shipping address is never saved to the checkout session before order creation!**

---

## Code Location

**File**: `/app/checkout/page.tsx`  
**Lines**: 1150-1249

```typescript
// Current flow (BROKEN):
const sessionResponse = await fetch('/api/checkout/session', {
  // ... creates session WITHOUT shipping address
})

const orderResponse = await fetch('/api/orders/create-before-payment', {
  checkout_session_id: sessionData.session_id  // Session has no shipping address!
})

// Redirect to Stripe
window.location.href = stripeData.url  // Shipping address never saved!
```

---

## Solution

### Option 1: Save Shipping Address Before Order Creation (RECOMMENDED)

Update the checkout session with shipping address BEFORE creating the order:

```typescript
// After creating checkout session
const sessionResponse = await fetch('/api/checkout/session', ...)
const sessionData = await sessionResponse.json()

// ✅ UPDATE: Save shipping address to checkout session
await fetch('/api/checkout/session', {
  method: 'PATCH',
  body: JSON.stringify({
    session_id: sessionData.session_id,
    shipping_address: {
      full_name: selectedAddress.full_name,
      phone: selectedAddress.phone,
      address_line1: selectedAddress.address_line1,
      address_line2: selectedAddress.address_line2,
      city: selectedAddress.city,
      state_province: selectedAddress.state_province,
      postal_code: selectedAddress.postal_code,
      country: selectedAddress.country,
    }
  })
})

// Now create order (will have shipping address)
const orderResponse = await fetch('/api/orders/create-before-payment', {
  checkout_session_id: sessionData.session_id
})
```

### Option 2: Pass Shipping Address Directly to Order Creation

Modify `create_order_before_payment` to accept shipping address parameter:

```sql
CREATE OR REPLACE FUNCTION create_order_before_payment(
  p_checkout_session_id UUID,
  p_shipping_address JSONB DEFAULT NULL,  -- NEW PARAMETER
  ...
) RETURNS UUID AS $$
BEGIN
  -- Use provided shipping address if available
  INSERT INTO orders (
    ...
    shipping_address,
    ...
  ) VALUES (
    ...
    COALESCE(
      p_shipping_address,  -- Use provided address first
      v_session.guest_shipping_address,
      v_session.shipping_address
    ),
    ...
  )
END;
$$;
```

---

## Implementation (Option 1 - Recommended)

### Step 1: Update Checkout Page

**File**: `/app/checkout/page.tsx`  
**Location**: Around line 1196

```typescript
// For non-ID regions, redirect to Stripe checkout
if (!isIDRegion) {
  console.log('💳 [STRIPE] Creating Stripe checkout session for non-ID region...')
  
  // ✅ NEW: Update checkout session with shipping address FIRST
  console.log('📍 [STRIPE] Saving shipping address to checkout session...')
  await fetch('/api/checkout/session', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionData.session_id,
      shipping_address: {
        full_name: selectedAddress.full_name,
        phone: selectedAddress.phone,
        address_line1: selectedAddress.address_line1,
        address_line2: selectedAddress.address_line2 || '',
        city: selectedAddress.city,
        state_province: selectedAddress.state_province,
        postal_code: selectedAddress.postal_code,
        country: selectedAddress.country,
      }
    })
  })
  console.log('✅ [STRIPE] Shipping address saved')
  
  // Now create Stripe items and redirect
  const itemsForStripe = cartItems.map(item => {
    // ... existing code
  })
  
  const stripeResponse = await fetch('/api/stripe/create-checkout-session', {
    // ... existing code
  })
  
  window.location.href = stripeData.url
  return
}
```

### Step 2: Verify PATCH Endpoint Handles shipping_address

**File**: `/app/api/checkout/session/route.ts`  
**Check**: Lines 263-270

```typescript
const updateData: any = {}
if (current_step) updateData.current_step = current_step
if (customer_email) updateData.customer_email = customer_email
if (addressId) updateData.shipping_address_id = addressId
if (guestAddressData) updateData.guest_shipping_address = guestAddressData
if (shipping_address) updateData.shipping_address = shipping_address  // ✅ Add this
if (shipping_method_id) updateData.shipping_method_id = shipping_method_id
if (payment_method_type) updateData.payment_method_type = payment_method_type
```

---

## Testing

### Test Case 1: New Stripe Order
1. Add item to cart
2. Go to checkout
3. Select shipping address
4. Click "Place Order"
5. **Verify**: Order created with shipping_address populated
6. Complete Stripe payment
7. **Verify**: Order details page shows shipping address

### Test Case 2: Existing Orders
1. Run migration 90 to fix old orders
2. **Verify**: All orders now have full_name and phone

### SQL Verification
```sql
-- Check recent Stripe orders
SELECT 
  order_number,
  payment_gateway,
  shipping_address IS NOT NULL as has_address,
  shipping_address->>'full_name' as full_name,
  shipping_address->>'phone' as phone,
  shipping_address->>'address_line1' as address,
  created_at
FROM orders
WHERE payment_gateway = 'stripe'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: All should have `has_address = true`

---

## Impact

**Affected Features**:
- ❌ Order tracking page (no shipping address shown)
- ❌ Order details page (no shipping address shown)
- ❌ DHL label creation (requires shipping address)
- ❌ Email notifications (incomplete order info)
- ❌ CMS order management (can't fulfill orders)

**Severity**: 🔴 CRITICAL - Blocks order fulfillment

---

## Quick Fix for Existing Orders

If you have orders without shipping addresses, you can try to recover them from Stripe:

```typescript
// API endpoint: /api/admin/fix-stripe-addresses
// Fetch Stripe session and extract shipping details
const session = await stripe.checkout.sessions.retrieve(stripe_session_id, {
  expand: ['customer', 'shipping']
})

if (session.shipping) {
  await supabase
    .from('orders')
    .update({
      shipping_address: {
        full_name: session.shipping.name,
        phone: session.customer_details?.phone || '',
        address_line1: session.shipping.address.line1,
        address_line2: session.shipping.address.line2,
        city: session.shipping.address.city,
        state_province: session.shipping.address.state,
        postal_code: session.shipping.address.postal_code,
        country: session.shipping.address.country,
      }
    })
    .eq('stripe_session_id', stripe_session_id)
}
```

---

## Summary

**Issue**: Stripe orders missing shipping address  
**Cause**: Shipping address not saved to checkout session before order creation  
**Solution**: Update checkout session with shipping address before creating order  
**Priority**: 🔴 CRITICAL  
**Files to Modify**: `/app/checkout/page.tsx`  
**Migration**: Run migration 90 to fix existing orders

---

**Status**: ⚠️ NEEDS IMMEDIATE FIX  
**Next Steps**:
1. Apply code fix to checkout page
2. Run migration 90 for existing orders
3. Test Stripe checkout flow
4. Verify shipping addresses are captured
