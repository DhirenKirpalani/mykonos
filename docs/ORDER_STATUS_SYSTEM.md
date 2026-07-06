# Order Status System Documentation

## Overview
The Mykonos e-commerce platform uses a dual-status system for orders:
1. **Order Status** (`orders.status`) - Tracks the fulfillment lifecycle
2. **Payment Status** (`orders.payment_status`) - Tracks payment state

---

## Order Status Values

### `pending_payment`
- **Description**: Order created, awaiting payment
- **When Set**: When order is first created via `create_order_before_payment()`
- **Next States**: `processing` (on payment success) or `cancelled` (on payment failure/expiry)
- **UI Display**: "Pending Payment" / "Menunggu Pembayaran"
- **Color**: Orange (`bg-orange-100 text-orange-800`)
- **Actions Available**: 
  - Complete payment
  - Cancel order
  - View order details

### `processing`
- **Description**: Payment confirmed, order being prepared
- **When Set**: After successful payment via webhook
- **Next States**: `packed`
- **UI Display**: "Processing" / "Diproses"
- **Color**: Blue (`bg-blue-100 text-blue-800`)
- **Actions Available**:
  - Mark as packed (admin)
  - View order details

### `packed`
- **Description**: Order packed and ready for shipment
- **When Set**: Admin marks order as packed
- **Next States**: `shipped`
- **UI Display**: "Packed" / "Dikemas"
- **Color**: Purple (`bg-purple-100 text-purple-800`)
- **Actions Available**:
  - Create shipping label (admin)
  - Mark as shipped (admin)

### `shipped`
- **Description**: Order shipped to customer
- **When Set**: Shipping label created or admin marks as shipped
- **Next States**: `delivered`
- **UI Display**: "Shipped" / "Dikirim"
- **Color**: Indigo (`bg-indigo-100 text-indigo-800`)
- **Actions Available**:
  - Track shipment
  - View tracking details

### `delivered`
- **Description**: Order delivered to customer
- **When Set**: Tracking shows delivery or admin confirms
- **Next States**: None (terminal state) or `refunded`
- **UI Display**: "Delivered" / "Terkirim"
- **Color**: Green (`bg-green-100 text-green-800`)
- **Actions Available**:
  - Leave review
  - Request return/refund

### `cancelled`
- **Description**: Order cancelled
- **When Set**: User cancels before payment, payment expires, or admin cancels
- **Next States**: None (terminal state)
- **UI Display**: "Cancelled" / "Dibatalkan"
- **Color**: Gray (`bg-gray-100 text-gray-800`)
- **Actions Available**:
  - View cancellation reason

### `refunded`
- **Description**: Order refunded
- **When Set**: Admin processes refund
- **Next States**: None (terminal state)
- **UI Display**: "Refunded" / "Dikembalikan"
- **Color**: Red (`bg-red-100 text-red-800`)
- **Actions Available**:
  - View refund details

---

## Payment Status Values

### `pending`
- **Description**: Payment not yet completed
- **When Set**: Order creation
- **Next States**: `completed`, `failed`, `expired`

### `completed`
- **Description**: Payment successfully processed
- **When Set**: Payment webhook confirms success
- **Next States**: `refunded`

### `failed`
- **Description**: Payment attempt failed
- **When Set**: Payment gateway returns failure
- **Next States**: `pending` (retry), `cancelled`

### `expired`
- **Description**: Payment window expired
- **When Set**: 24 hours after order creation without payment
- **Next States**: `cancelled`

### `refunded`
- **Description**: Payment refunded to customer
- **When Set**: Admin processes refund
- **Next States**: None (terminal state)

---

## Status Flow Diagram

```
┌─────────────────┐
│ pending_payment │ ← Order Created
└────────┬────────┘
         │
         ├─── Payment Success ───→ ┌────────────┐
         │                         │ processing │
         │                         └──────┬─────┘
         │                                │
         │                                ↓
         │                         ┌────────┐
         │                         │ packed │
         │                         └────┬───┘
         │                              │
         │                              ↓
         │                         ┌─────────┐
         │                         │ shipped │
         │                         └────┬────┘
         │                              │
         │                              ↓
         │                         ┌───────────┐
         │                         │ delivered │
         │                         └───────────┘
         │
         └─── Payment Failed/Expired ───→ ┌───────────┐
                                           │ cancelled │
                                           └───────────┘
```

---

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  -- ... other fields
);
```

### Status Comments
```sql
COMMENT ON COLUMN orders.status IS 
  'Order status: pending_payment (awaiting payment), processing (payment confirmed), 
   packed, shipped, delivered, cancelled, refunded';

COMMENT ON COLUMN orders.payment_status IS 
  'Payment status: pending, completed, failed, refunded, expired';
```

---

## Migration History

### Migration 89: Fix Order Status Consistency
**Issue**: Database was using `'pending'` but UI expected `'pending_payment'`

**Changes**:
1. Updated existing orders: `'pending'` → `'pending_payment'`
2. Fixed `create_order_before_payment()` function to use `'pending_payment'`
3. Added database comments for clarity

**Why This Matters**:
- Ensures consistency between database and UI
- Prevents confusion in admin dashboard
- Fixes status filter buttons showing incorrect counts
- Resolves translation key mismatches

---

## Code Examples

### Creating an Order
```typescript
// Order is created with pending_payment status
const orderId = await supabase.rpc('create_order_before_payment', {
  p_checkout_session_id: sessionId,
  p_snap_token: snapToken,
  p_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000)
})

// Order status: 'pending_payment'
// Payment status: 'pending'
```

### Updating Order Status (Admin)
```typescript
const { error } = await supabase
  .from('orders')
  .update({ status: 'processing' })
  .eq('id', orderId)
```

### Checking Order Status (Frontend)
```typescript
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending_payment: t.trackOrder.statuses.pending_payment,
    processing: t.trackOrder.statuses.processing,
    packed: t.trackOrder.statuses.packed,
    shipped: t.trackOrder.statuses.shipped,
    delivered: t.trackOrder.statuses.delivered,
    cancelled: t.trackOrder.statuses.cancelled,
    refunded: t.trackOrder.statuses.refunded,
  }
  return labels[status] || status
}
```

---

## UI Components

### Status Badge Component
```typescript
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending_payment: 'bg-orange-100 text-orange-800',
    processing: 'bg-blue-100 text-blue-800',
    packed: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    refunded: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
```

### Status Filter Buttons (CMS)
```typescript
<button
  onClick={() => setStatusFilter('pending_payment')}
  className={`${statusFilter === 'pending_payment' 
    ? 'bg-orange-600 text-white' 
    : 'bg-orange-100 text-orange-800'}`}
>
  Pending Payment ({statusCounts.pending_payment})
</button>
```

---

## Translation Keys

### English (`lib/translations.ts`)
```typescript
statuses: {
  pending_payment: "Pending Payment",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
}
```

### Indonesian
```typescript
statuses: {
  pending_payment: "Menunggu Pembayaran",
  processing: "Diproses",
  packed: "Dikemas",
  shipped: "Dikirim",
  delivered: "Terkirim",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
}
```

---

## Common Issues & Solutions

### Issue 1: Status shows "pending" instead of "Pending Payment"
**Cause**: Old orders created before migration 89
**Solution**: Run migration 89 to update existing orders

### Issue 2: Filter buttons show 0 for "Pending Payment"
**Cause**: Database has `'pending'` but filter checks for `'pending_payment'`
**Solution**: Apply migration 89

### Issue 3: Translation missing for status
**Cause**: Using wrong status value in code
**Solution**: Always use `'pending_payment'` not `'pending'` for new orders

---

## Best Practices

1. **Always use `pending_payment`** for orders awaiting payment
2. **Never use `pending`** as an order status (only for payment_status)
3. **Update both statuses** when processing payments
4. **Log status changes** in `order_status_history` table
5. **Send notifications** on status changes
6. **Check payment_status** before allowing status changes

---

## Testing Checklist

- [ ] New orders created with `pending_payment` status
- [ ] Payment success updates status to `processing`
- [ ] Admin can update status through workflow
- [ ] Status filters work correctly in CMS
- [ ] Status badges display correct colors
- [ ] Translations work for both languages
- [ ] Status timeline shows correct progression
- [ ] Email notifications use correct status labels

---

## Related Files

### Database
- `/supabase/migrations/89_fix_order_status_consistency.sql`
- `/supabase/migrations/88_fix_currency_metadata_in_orders.sql`
- `/supabase/migrations/77_create_order_before_payment_with_currency.sql`

### Frontend Components
- `/app/cms/orders/page.tsx` - Admin order list with filters
- `/app/cms/orders/[id]/page.tsx` - Order detail page
- `/app/track-order/page.tsx` - Customer order tracking
- `/app/account/orders/page.tsx` - Customer order history
- `/components/OrderDetailsModal.tsx` - Order details modal
- `/components/order/OrderStatusTimeline.tsx` - Status timeline

### Utilities
- `/lib/translations.ts` - Status translations
- `/lib/email/templates.tsx` - Email templates with status

---

**Last Updated**: May 25, 2026  
**Migration Version**: 89
