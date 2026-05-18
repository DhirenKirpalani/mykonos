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

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 Starting DHL tracking poll...')
    console.log('⏰ Time:', new Date().toISOString())
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
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
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return NextResponse.json({ 
        success: true, 
        message: 'No orders to poll',
        polled: 0,
        timestamp: now.toISOString()
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
          
          // Still update last_tracking_poll to avoid repeated failures
          await supabase
            .from('orders')
            .update({ last_tracking_poll: now.toISOString() })
            .eq('id', order.id)
          
          results.push({
            orderNumber: order.order_number,
            success: false,
            error: 'No tracking data available'
          })
          continue
        }

        const shipment = tracking.shipments[0]
        const events = shipment.events || []
        const latestEvent = events[events.length - 1]
        
        // Map DHL status to our status
        const newStatus = mapDHLStatus(latestEvent?.typeCode, order.shipping_status)
        const statusChanged = newStatus !== order.shipping_status
        
        console.log(`📊 ${order.order_number}: ${order.shipping_status} → ${newStatus}${statusChanged ? ' ✨ CHANGED' : ''}`)
        if (latestEvent) {
          console.log(`   Latest: ${latestEvent.description} (${latestEvent.date} ${latestEvent.time})`)
        }

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
          try {
            await sendStatusUpdateEmail(order, newStatus, latestEvent)
          } catch (emailError: any) {
            console.error(`⚠️  Email failed for ${order.order_number}:`, emailError.message)
            // Don't fail the whole poll if email fails
          }
        }

        results.push({
          orderNumber: order.order_number,
          success: true,
          oldStatus: order.shipping_status,
          newStatus: newStatus,
          statusChanged,
          latestEvent: latestEvent?.description,
          eventDate: latestEvent?.date,
          eventTime: latestEvent?.time
        })

        // Rate limiting: wait 500ms between DHL API calls
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        console.error(`❌ Error polling ${order.order_number}:`, error.message)
        results.push({
          orderNumber: order.order_number,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const changedCount = results.filter(r => r.success && r.statusChanged).length
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Poll complete: ${successCount}/${orders.length} successful`)
    console.log(`📬 Status changes: ${changedCount}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      polled: orders.length,
      successful: successCount,
      statusChanges: changedCount,
      timestamp: now.toISOString(),
      results
    })

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💥 Cron job error:', error.message)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Map DHL event type codes to our shipping status
 */
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
    'CC': 'in_transit',          // Clearance completed (back to normal)
    'BR': 'in_transit',          // Broker release (back to normal)
    'NH': 'exception',           // Not home
    'OH': 'exception',           // On hold
  }

  return statusMap[typeCode] || currentStatus
}

/**
 * Send email notification for status change
 */
async function sendStatusUpdateEmail(
  order: any,
  newStatus: string,
  event: any
) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mykonos.com'
    
    // Call your email API
    const response = await fetch(`${appUrl}/api/emails/shipping-update`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}` // Internal auth
      },
      body: JSON.stringify({
        orderNumber: order.order_number,
        customerEmail: order.customer_email,
        customerName: order.customer_first_name || 'Customer',
        status: newStatus,
        trackingNumber: order.tracking_number,
        eventDescription: event.description,
        eventDate: event.date,
        eventTime: event.time,
        location: event.serviceArea?.[0]?.description || 'In transit',
        signedBy: event.signedBy,
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Email API error: ${error}`)
    }

    console.log(`✅ Email sent to ${order.customer_email}`)
  } catch (error: any) {
    console.error('Failed to send email:', error.message)
    // Don't throw - email failure shouldn't stop the poll
  }
}
