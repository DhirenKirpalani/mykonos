# Orders Page Integration Example

## Adding Fulfill Button to Existing Orders Page

Here's how to integrate the async shipping fulfillment into your existing orders management page.

### Option 1: Add to Orders List (Recommended)

Update `app/cms/orders/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Package, Truck, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FulfillOrderButton } from '@/components/admin/FulfillOrderButton' // Add this import

interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  payment_status: string // Add this field
  total_amount: number
  created_at: string
  user?: {
    first_name: string
    last_name: string
    email: string
  }
}

export default function OrdersPage() {
  // ... existing state and functions ...

  return (
    <div className="space-y-6">
      {/* ... existing header and filters ... */}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
              <th className="pb-3">Order</th>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Total</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="text-sm">
                {/* ... existing columns ... */}
                
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/cms/orders/${order.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    
                    {/* ADD THIS: Fulfill button */}
                    <FulfillOrderButton
                      orderId={order.id}
                      orderNumber={order.order_number}
                      orderStatus={order.status}
                      paymentStatus={order.payment_status}
                      onSuccess={fetchOrders}
                    />
                    
                    {/* Keep existing status dropdown */}
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-luxury-gold focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### Option 2: Add to Order Detail Page

If you have an order detail page at `app/cms/orders/[id]/page.tsx`:

```tsx
'use client'

import { FulfillOrderButton } from '@/components/admin/FulfillOrderButton'

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null)

  const fetchOrder = async () => {
    // ... fetch order logic ...
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order {order?.order_number}</h1>
        
        {/* ADD THIS: Fulfill button in header */}
        {order && (
          <FulfillOrderButton
            orderId={order.id}
            orderNumber={order.order_number}
            orderStatus={order.status}
            paymentStatus={order.payment_status}
            onSuccess={fetchOrder}
          />
        )}
      </div>

      {/* ... rest of order details ... */}
    </div>
  )
}
```

### Option 3: Bulk Fulfillment

For bulk operations, create a custom component:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Package } from 'lucide-react'

interface BulkFulfillButtonProps {
  selectedOrderIds: string[]
  onSuccess?: () => void
}

export function BulkFulfillButton({ selectedOrderIds, onSuccess }: BulkFulfillButtonProps) {
  const [isFulfilling, setIsFulfilling] = useState(false)

  const handleBulkFulfill = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error('No orders selected')
      return
    }

    setIsFulfilling(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Not authenticated')
        return
      }

      const results = await Promise.allSettled(
        selectedOrderIds.map(orderId =>
          fetch('/api/admin/shipping/fulfill', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ order_id: orderId }),
          })
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      toast.success(`Created ${successful} shipping jobs. ${failed} failed.`)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Bulk fulfill error:', error)
      toast.error('Failed to create shipping jobs')
    } finally {
      setIsFulfilling(false)
    }
  }

  return (
    <Button
      onClick={handleBulkFulfill}
      disabled={isFulfilling || selectedOrderIds.length === 0}
    >
      <Package className="h-4 w-4 mr-2" />
      {isFulfilling ? 'Creating Jobs...' : `Fulfill ${selectedOrderIds.length} Orders`}
    </Button>
  )
}
```

## Update API to Include payment_status

Make sure your orders API returns `payment_status`:

```tsx
// app/api/orders/admin/route.ts
export async function GET(request: NextRequest) {
  // ... auth checks ...

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      user_id,
      status,
      payment_status,  // Add this
      total_amount,
      created_at,
      user:users(first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })

  return NextResponse.json(data)
}
```

## Navigation Menu Update

Add link to shipping jobs dashboard in your CMS navigation:

```tsx
// app/cms/layout.tsx or your navigation component
const navigation = [
  { name: 'Dashboard', href: '/cms', icon: LayoutDashboard },
  { name: 'Orders', href: '/cms/orders', icon: ShoppingCart },
  { name: 'Shipping Jobs', href: '/cms/shipping-jobs', icon: Truck }, // Add this
  { name: 'Products', href: '/cms/products', icon: Package },
  // ... other items
]
```

## Complete Flow Example

Here's the complete user flow:

1. **Customer places order** → Order created with `status: paid`, `payment_status: completed`

2. **Admin views orders** → Goes to `/cms/orders`

3. **Admin clicks "Fulfill Order"** → 
   - API call to `/api/admin/shipping/fulfill`
   - Shipping job created in database
   - Order status changes to `processing`
   - Button shows success message

4. **Worker processes job** →
   - Worker polls database
   - Acquires job with lock
   - Calls courier API
   - Updates order with tracking info
   - Order status changes to `shipped`

5. **Admin monitors progress** → Goes to `/cms/shipping-jobs`
   - Sees job status
   - Can retry if failed
   - Views error messages

6. **Customer receives tracking** →
   - Order page shows tracking number
   - Email notification sent (if configured)

## Testing Checklist

- [ ] Fulfill button appears for paid orders
- [ ] Fulfill button disabled for cancelled/shipped orders
- [ ] Clicking fulfill creates job in database
- [ ] Order status changes to "processing"
- [ ] Worker picks up job and processes it
- [ ] Order updated with tracking number
- [ ] Shipping jobs dashboard shows correct status
- [ ] Manual retry works for failed jobs
- [ ] Idempotency prevents duplicate jobs

## Common Issues

**Button not showing:**
- Check order has `payment_status: completed`
- Check order status is not `shipped`, `delivered`, `cancelled`, or `refunded`

**Job created but not processing:**
- Check worker is running
- Check worker logs
- Verify database connection

**Multiple jobs for same order:**
- Should not happen due to idempotency
- Check `idempotency_key` is unique
- Report as bug if it occurs

## Next Steps

1. Integrate fulfill button into your orders page
2. Test with a real order
3. Monitor shipping jobs dashboard
4. Replace mock courier with real API
5. Set up monitoring and alerts
