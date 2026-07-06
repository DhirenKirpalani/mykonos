# DHL Shipment Status Polling Strategy

## 📋 Overview

**Important**: DHL Express API v3.2.2 does **NOT** have webhooks in the standard API. The webhook documentation was for a different/enterprise version.

For standard DHL Express API, we need to **poll** the tracking API to get status updates.

---

## ✅ Available API: Tracking Status Check

### Endpoint
```
GET /track/shipments?shipmentTrackingNumber={trackingNumber}
```

### Features
- ✅ Real-time tracking information
- ✅ All checkpoint events
- ✅ Estimated delivery date
- ✅ Current status
- ✅ Delivery signature (if delivered)
- ✅ Exception details (if any)

### Response Example
```json
{
  "shipments": [{
    "shipmentTrackingNumber": "1234567890",
    "status": "Success",
    "events": [
      {
        "date": "2026-05-18",
        "time": "10:30:00",
        "typeCode": "OK",
        "description": "Delivered",
        "serviceArea": [{
          "code": "JKT",
          "description": "Jakarta-ID"
        }],
        "signedBy": "Customer"
      }
    ]
  }]
}
```

---

## 🔄 Polling Strategy

### Recommended Intervals

| Order Status | Poll Interval | Reason |
|-------------|---------------|---------|
| **Pending Shipment** | Don't poll | No tracking number yet |
| **Just Shipped** (0-24h) | **Every 2 hours** | Frequent updates during pickup |
| **In Transit** (1-3 days) | **Every 6 hours** | Regular transit updates |
| **Out for Delivery** | **Every 1 hour** | Critical delivery window |
| **Delivered** | **Stop polling** | Final status reached |
| **Exception/Returned** | **Every 12 hours** | Monitor resolution |

### Why These Intervals?

1. **Every 2 hours (new shipments)**
   - DHL pickup usually happens within 24h
   - Catch first scan quickly
   - Customer wants to know it's moving

2. **Every 6 hours (in transit)**
   - Balance between freshness and API costs
   - DHL updates ~2-3 times per day during transit
   - Reduces unnecessary API calls

3. **Every 1 hour (out for delivery)**
   - Most critical time for customer
   - Delivery can happen anytime
   - Worth the extra API calls

4. **Every 12 hours (exceptions)**
   - Monitor for resolution
   - Not time-critical
   - Avoid excessive polling

---

## 🛠️ Implementation Options

### Option 1: Cron Job (Recommended)

**Best for**: Production environments with scheduled tasks

```typescript
// app/api/cron/poll-dhl-tracking/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { dhlClient } from '@/lib/dhl/client'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  
  // Get orders that need polling
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, tracking_number, shipping_status, shipped_at')
    .not('tracking_number', 'is', null)
    .in('shipping_status', ['shipped', 'in_transit', 'out_for_delivery', 'exception'])
    .or(`
      last_tracking_poll.is.null,
      last_tracking_poll.lt.${getNextPollTime(now).toISOString()}
    `)
    .limit(50) // Process in batches

  if (!orders || orders.length === 0) {
    return NextResponse.json({ message: 'No orders to poll' })
  }

  const results = []

  for (const order of orders) {
    try {
      // Get tracking info from DHL
      const tracking = await dhlClient.trackShipment(order.tracking_number)
      
      if (tracking.shipments[0]) {
        const shipment = tracking.shipments[0]
        const latestEvent = shipment.events?.[shipment.events.length - 1]
        
        // Determine new status
        const newStatus = mapDHLStatusToOurStatus(latestEvent?.typeCode)
        
        // Update order
        await supabase
          .from('orders')
          .update({
            shipping_status: newStatus,
            tracking_events: shipment.events,
            estimated_delivery_date: shipment.estimatedDeliveryDate,
            last_tracking_poll: now.toISOString(),
          })
          .eq('id', order.id)

        // Send email if status changed
        if (newStatus !== order.shipping_status) {
          await sendStatusUpdateEmail(order, newStatus, latestEvent)
        }

        results.push({
          orderNumber: order.order_number,
          status: newStatus,
          updated: true,
        })
      }
    } catch (error) {
      console.error(`Failed to poll order ${order.order_number}:`, error)
      results.push({
        orderNumber: order.order_number,
        error: error.message,
      })
    }
  }

  return NextResponse.json({
    success: true,
    polled: orders.length,
    results,
  })
}

function getNextPollTime(now: Date): Date {
  // Calculate when next poll should happen based on current time
  // This is a simplified version - see full implementation below
  return new Date(now.getTime() - 6 * 60 * 60 * 1000) // 6 hours ago
}

function mapDHLStatusToOurStatus(typeCode: string): string {
  const statusMap = {
    'PU': 'picked_up',
    'PL': 'in_transit',
    'DF': 'in_transit',
    'WC': 'out_for_delivery',
    'OK': 'delivered',
    'RT': 'returned',
    'CM': 'exception',
  }
  return statusMap[typeCode] || 'in_transit'
}
```

**Setup Cron Job (Vercel)**:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/poll-dhl-tracking",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

**Setup Cron Job (Linux)**:
```bash
# Run every 2 hours
0 */2 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://mykonos.com/api/cron/poll-dhl-tracking
```

---

### Option 2: Background Worker (Node.js)

**Best for**: Self-hosted environments

```typescript
// scripts/dhl-polling-worker.ts
import { supabase } from '@/lib/supabase/client'
import { dhlClient } from '@/lib/dhl/client'

const POLL_INTERVALS = {
  just_shipped: 2 * 60 * 60 * 1000,    // 2 hours
  in_transit: 6 * 60 * 60 * 1000,      // 6 hours
  out_for_delivery: 1 * 60 * 60 * 1000, // 1 hour
  exception: 12 * 60 * 60 * 1000,      // 12 hours
}

async function pollOrders() {
  console.log('🔄 Starting DHL tracking poll...')
  
  const now = new Date()
  
  // Get orders to poll
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .not('tracking_number', 'is', null)
    .in('shipping_status', ['shipped', 'in_transit', 'out_for_delivery', 'exception'])
  
  for (const order of orders || []) {
    const interval = getPollInterval(order)
    const lastPoll = order.last_tracking_poll ? new Date(order.last_tracking_poll) : null
    
    // Skip if polled recently
    if (lastPoll && (now.getTime() - lastPoll.getTime()) < interval) {
      continue
    }
    
    try {
      await pollOrder(order)
    } catch (error) {
      console.error(`Failed to poll ${order.order_number}:`, error)
    }
    
    // Rate limiting: wait 1 second between calls
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('✅ Poll complete')
}

function getPollInterval(order: any): number {
  const shippedAt = new Date(order.shipped_at)
  const hoursSinceShipped = (Date.now() - shippedAt.getTime()) / (60 * 60 * 1000)
  
  if (order.shipping_status === 'out_for_delivery') {
    return POLL_INTERVALS.out_for_delivery
  }
  
  if (order.shipping_status === 'exception') {
    return POLL_INTERVALS.exception
  }
  
  if (hoursSinceShipped < 24) {
    return POLL_INTERVALS.just_shipped
  }
  
  return POLL_INTERVALS.in_transit
}

async function pollOrder(order: any) {
  const tracking = await dhlClient.trackShipment(order.tracking_number)
  // ... update logic same as Option 1
}

// Run continuously
setInterval(pollOrders, 5 * 60 * 1000) // Check every 5 minutes
pollOrders() // Run immediately
```

**Run as Service**:
```bash
# Using PM2
pm2 start scripts/dhl-polling-worker.ts --name dhl-poller

# Using systemd
sudo systemctl start dhl-poller
```

---

### Option 3: Queue-Based (Bull/BullMQ)

**Best for**: High-volume environments

```typescript
// lib/queues/dhl-tracking-queue.ts
import Queue from 'bull'
import { dhlClient } from '@/lib/dhl/client'

const trackingQueue = new Queue('dhl-tracking', process.env.REDIS_URL)

// Add job when order is shipped
export async function scheduleTrackingPoll(orderId: string, trackingNumber: string) {
  await trackingQueue.add(
    { orderId, trackingNumber },
    {
      repeat: { every: 2 * 60 * 60 * 1000 }, // Every 2 hours
      removeOnComplete: true,
    }
  )
}

// Process jobs
trackingQueue.process(async (job) => {
  const { orderId, trackingNumber } = job.data
  
  const tracking = await dhlClient.trackShipment(trackingNumber)
  // ... update order
  
  // Adjust repeat interval based on status
  if (tracking.shipments[0].events?.some(e => e.typeCode === 'OK')) {
    // Delivered - stop polling
    await job.remove()
  }
})
```

---

## 📊 Database Schema Updates

Add polling fields to orders table:

```sql
-- Migration: Add tracking poll fields
ALTER TABLE orders
ADD COLUMN last_tracking_poll TIMESTAMP WITH TIME ZONE,
ADD COLUMN tracking_events JSONB,
ADD COLUMN estimated_delivery_date DATE;

-- Index for efficient polling queries
CREATE INDEX idx_orders_tracking_poll 
ON orders(shipping_status, last_tracking_poll) 
WHERE tracking_number IS NOT NULL;
```

---

## 💰 Cost Optimization

### API Call Estimates

**Scenario**: 100 orders/day

| Status | Orders | Interval | Calls/Day | Total Calls |
|--------|--------|----------|-----------|-------------|
| Just Shipped | 30 | 2h | 12 | 360 |
| In Transit | 50 | 6h | 4 | 200 |
| Out for Delivery | 15 | 1h | 24 | 360 |
| Exception | 5 | 12h | 2 | 10 |
| **TOTAL** | **100** | - | - | **930/day** |

**Monthly**: ~28,000 API calls

### Optimization Tips

1. **Stop polling delivered orders** immediately
2. **Batch requests** when possible (up to 10 tracking numbers per call)
3. **Cache results** for 30 minutes for customer-facing queries
4. **Use last-checkpoint view** instead of all-checkpoints to reduce response size

---

## 🎯 Recommended Implementation

**For Mykonos (Vercel deployment)**:

1. **Use Vercel Cron** (Option 1)
   - Runs every 2 hours
   - Serverless - no infrastructure needed
   - Free on Vercel Pro

2. **Smart Polling Logic**
   - Calculate next poll time based on status
   - Store in `last_tracking_poll` field
   - Skip orders that don't need polling yet

3. **Email Notifications**
   - Send email when status changes
   - Don't spam on every poll

4. **Customer-Facing Tracking**
   - Show cached data (max 30 min old)
   - "Refresh" button for real-time check
   - Auto-refresh every 5 minutes on tracking page

---

## 📝 Implementation Checklist

- [ ] Add database fields (`last_tracking_poll`, `tracking_events`)
- [ ] Create cron endpoint `/api/cron/poll-dhl-tracking`
- [ ] Set up Vercel cron job (every 2 hours)
- [ ] Implement smart interval logic
- [ ] Add email notifications for status changes
- [ ] Create customer tracking page with auto-refresh
- [ ] Add "Refresh" button for manual updates
- [ ] Monitor API usage and costs
- [ ] Set up error logging and alerts

---

## 🚀 Next Steps

1. **Implement the cron job** (Option 1 recommended)
2. **Test with real tracking numbers**
3. **Monitor API usage** for first week
4. **Adjust intervals** based on actual DHL update patterns
5. **Add customer notifications**

Would you like me to implement the cron job polling system?
