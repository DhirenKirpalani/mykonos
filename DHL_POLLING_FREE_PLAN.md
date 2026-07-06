# DHL Polling for Vercel Free Plan

## 🆓 Free Plan Limitations

Vercel Free Plan does **NOT** include:
- ❌ Cron Jobs
- ❌ Background workers
- ❌ Long-running processes

But we can still poll DHL tracking using **external free services**!

---

## ✅ Option 1: GitHub Actions (Recommended - 100% Free)

**Pros:**
- ✅ Completely free
- ✅ Reliable scheduling
- ✅ Easy to set up
- ✅ 2,000 minutes/month free
- ✅ Runs even when you're not working

**Cons:**
- ⚠️ Minimum interval: 5 minutes
- ⚠️ Actual run time may vary ±15 minutes

### Setup Steps

#### 1. Create GitHub Action Workflow

Create file: `.github/workflows/poll-dhl-tracking.yml`

```yaml
name: Poll DHL Tracking

on:
  schedule:
    # Runs every 2 hours
    - cron: '0 */2 * * *'
  
  # Allow manual trigger
  workflow_dispatch:

jobs:
  poll-tracking:
    runs-on: ubuntu-latest
    
    steps:
      - name: Poll DHL Tracking API
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/poll-dhl-tracking" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
      
      - name: Log Result
        run: echo "DHL tracking poll completed at $(date)"
```

#### 2. Add Secrets to GitHub

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:
- `APP_URL`: `https://your-app.vercel.app`
- `CRON_SECRET`: Generate a random secret (e.g., `openssl rand -hex 32`)

#### 3. Create API Endpoint

Create file: `app/api/cron/poll-dhl-tracking/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dhlClient } from '@/lib/dhl/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max (Vercel free plan limit)

export async function GET(request: Request) {
  try {
    // 1. Verify authorization
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting DHL tracking poll...')
    
    // 2. Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin access
      { auth: { persistSession: false } }
    )

    // 3. Get orders that need polling
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, tracking_number, shipping_status, shipped_at, last_tracking_poll, customer_email, customer_first_name')
      .not('tracking_number', 'is', null)
      .in('shipping_status', ['shipped', 'in_transit', 'out_for_delivery', 'exception'])
      .or(`last_tracking_poll.is.null,last_tracking_poll.lt.${twoHoursAgo.toISOString()}`)
      .limit(20) // Process 20 orders per run to stay within time limit

    if (fetchError) {
      console.error('❌ Database error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No orders to poll')
      return NextResponse.json({ 
        success: true, 
        message: 'No orders to poll',
        polled: 0 
      })
    }

    console.log(`📦 Found ${orders.length} orders to poll`)

    // 4. Poll each order
    const results = []
    
    for (const order of orders) {
      try {
        console.log(`🔍 Polling ${order.order_number} (${order.tracking_number})`)
        
        // Get tracking from DHL
        const tracking = await dhlClient.trackShipment(order.tracking_number, {
          trackingView: 'all-checkpoints',
          levelOfDetail: 'shipment'
        })

        if (!tracking.shipments || tracking.shipments.length === 0) {
          console.log(`⚠️  No tracking data for ${order.order_number}`)
          continue
        }

        const shipment = tracking.shipments[0]
        const events = shipment.events || []
        const latestEvent = events[events.length - 1]
        
        // Map DHL status to our status
        const newStatus = mapDHLStatus(latestEvent?.typeCode, order.shipping_status)
        const statusChanged = newStatus !== order.shipping_status
        
        console.log(`📊 ${order.order_number}: ${order.shipping_status} → ${newStatus}`)

        // Update order in database
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            shipping_status: newStatus,
            tracking_events: events,
            estimated_delivery_date: shipment.estimatedDeliveryDate || null,
            last_tracking_poll: now.toISOString(),
          })
          .eq('id', order.id)

        if (updateError) {
          console.error(`❌ Failed to update ${order.order_number}:`, updateError)
          results.push({
            orderNumber: order.order_number,
            success: false,
            error: updateError.message
          })
          continue
        }

        // Send email if status changed
        if (statusChanged && latestEvent) {
          console.log(`📧 Sending status update email for ${order.order_number}`)
          await sendStatusUpdateEmail(order, newStatus, latestEvent)
        }

        results.push({
          orderNumber: order.order_number,
          success: true,
          oldStatus: order.shipping_status,
          newStatus: newStatus,
          statusChanged,
          latestEvent: latestEvent?.description
        })

        // Rate limiting: wait 500ms between DHL API calls
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        console.error(`❌ Error polling ${order.order_number}:`, error)
        results.push({
          orderNumber: order.order_number,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`✅ Poll complete: ${successCount}/${orders.length} successful`)

    return NextResponse.json({
      success: true,
      polled: orders.length,
      successful: successCount,
      results
    })

  } catch (error: any) {
    console.error('💥 Cron job error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    )
  }
}

// Map DHL event type codes to our shipping status
function mapDHLStatus(typeCode: string | undefined, currentStatus: string): string {
  if (!typeCode) return currentStatus

  const statusMap: Record<string, string> = {
    'PU': 'picked_up',           // Picked up
    'PL': 'in_transit',          // Processed at location
    'DF': 'in_transit',          // Departed facility
    'AF': 'in_transit',          // Arrived at facility
    'WC': 'out_for_delivery',    // With delivery courier
    'OK': 'delivered',           // Delivered
    'RT': 'returned',            // Returned to sender
    'CM': 'exception',           // Customer moved
    'CD': 'exception',           // Clearance delay
    'CC': 'exception',           // Clearance completed
    'BR': 'exception',           // Broker release
  }

  return statusMap[typeCode] || currentStatus
}

// Send email notification
async function sendStatusUpdateEmail(
  order: any,
  newStatus: string,
  event: any
) {
  try {
    // Call your email API
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/shipping-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.order_number,
        customerEmail: order.customer_email,
        customerName: order.customer_first_name,
        status: newStatus,
        trackingNumber: order.tracking_number,
        eventDescription: event.description,
        eventDate: event.date,
        eventTime: event.time,
        location: event.serviceArea?.[0]?.description,
      })
    })
  } catch (error) {
    console.error('Failed to send email:', error)
    // Don't throw - email failure shouldn't stop the poll
  }
}
```

#### 4. Add Environment Variables to Vercel

In Vercel Dashboard → Settings → Environment Variables:

```bash
CRON_SECRET=your-random-secret-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 5. Test the Setup

**Manual trigger from GitHub:**
1. Go to: **Actions → Poll DHL Tracking → Run workflow**
2. Check logs to verify it works

**Test the endpoint directly:**
```bash
curl -X GET "https://your-app.vercel.app/api/cron/poll-dhl-tracking" \
  -H "Authorization: Bearer your-cron-secret"
```

---

## ✅ Option 2: EasyCron (Free Tier)

**Pros:**
- ✅ Free tier: 20 cron jobs
- ✅ Runs every hour minimum
- ✅ Web UI for management
- ✅ Email notifications on failure

**Cons:**
- ⚠️ Requires account signup
- ⚠️ Free tier limited to 1 job/hour

### Setup Steps

1. **Sign up**: https://www.easycron.com/
2. **Create Cron Job**:
   - URL: `https://your-app.vercel.app/api/cron/poll-dhl-tracking`
   - Schedule: `0 */2 * * *` (every 2 hours)
   - HTTP Method: GET
   - Custom Headers: `Authorization: Bearer your-cron-secret`
3. **Save and Enable**

---

## ✅ Option 3: cron-job.org (Free)

**Pros:**
- ✅ Completely free
- ✅ No credit card required
- ✅ Runs every 5 minutes minimum
- ✅ Execution history

**Cons:**
- ⚠️ Ads on dashboard
- ⚠️ Limited to 50 jobs

### Setup Steps

1. **Sign up**: https://cron-job.org/
2. **Create Cron Job**:
   - Title: "Poll DHL Tracking"
   - URL: `https://your-app.vercel.app/api/cron/poll-dhl-tracking`
   - Schedule: Every 2 hours
   - Request Method: GET
   - Headers: Add `Authorization: Bearer your-cron-secret`
3. **Enable and Save**

---

## ✅ Option 4: Render.com Cron Jobs (Free)

**Pros:**
- ✅ Free tier available
- ✅ Integrated with hosting
- ✅ Reliable

**Cons:**
- ⚠️ Requires separate Render account
- ⚠️ Free tier spins down after inactivity

### Setup Steps

1. **Sign up**: https://render.com/
2. **Create Cron Job**:
   - Type: Cron Job
   - Command: `curl -X GET "https://your-app.vercel.app/api/cron/poll-dhl-tracking" -H "Authorization: Bearer $CRON_SECRET"`
   - Schedule: `0 */2 * * *`
3. **Add Environment Variable**: `CRON_SECRET`

---

## 📊 Comparison Table

| Service | Cost | Min Interval | Reliability | Setup Difficulty |
|---------|------|--------------|-------------|------------------|
| **GitHub Actions** | Free | 5 min | ⭐⭐⭐⭐⭐ | Easy |
| **EasyCron** | Free | 1 hour | ⭐⭐⭐⭐ | Very Easy |
| **cron-job.org** | Free | 5 min | ⭐⭐⭐⭐ | Very Easy |
| **Render.com** | Free | 1 min | ⭐⭐⭐⭐ | Medium |

---

## 🎯 Recommended: GitHub Actions

**Why?**
1. ✅ Already using GitHub for code
2. ✅ No additional service signup
3. ✅ 100% free forever
4. ✅ Reliable and well-documented
5. ✅ Easy to monitor in Actions tab
6. ✅ Can manually trigger anytime

**Limitations:**
- Runs every 2 hours (not real-time)
- May have ±15 min variance
- But this is **perfect** for DHL tracking (they update 2-4x/day anyway)

---

## 🚀 Quick Start (GitHub Actions)

**1. Create the workflow file:**
```bash
mkdir -p .github/workflows
```

**2. Copy the YAML above** to `.github/workflows/poll-dhl-tracking.yml`

**3. Add GitHub secrets:**
- `APP_URL`: Your Vercel app URL
- `CRON_SECRET`: Random secret

**4. Create the API endpoint** (code above)

**5. Add to `.env.local`:**
```bash
CRON_SECRET=your-secret-here
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

**6. Deploy to Vercel**

**7. Test manually** from GitHub Actions tab

**Done!** 🎉

---

## 💡 Pro Tips

1. **Start with every 2 hours** - DHL doesn't update more frequently
2. **Monitor GitHub Actions** for failures
3. **Set up email alerts** in GitHub (Settings → Notifications)
4. **Add logging** to track API usage
5. **Use service role key** for Supabase (not anon key)

---

## 🐛 Troubleshooting

**GitHub Action fails:**
- Check secrets are set correctly
- Verify API endpoint is deployed
- Check Vercel logs for errors

**No orders being polled:**
- Verify orders have `tracking_number`
- Check `shipping_status` is correct
- Ensure `last_tracking_poll` logic is working

**DHL API errors:**
- Check API credentials
- Verify tracking numbers are valid
- Monitor rate limits

---

## 📝 Next Steps

1. ✅ Create GitHub Action workflow
2. ✅ Add secrets to GitHub
3. ✅ Create API endpoint
4. ✅ Deploy to Vercel
5. ✅ Test manually
6. ✅ Monitor for 24 hours
7. ✅ Adjust interval if needed

**Ready to implement?** Let me know if you want me to create the files!
