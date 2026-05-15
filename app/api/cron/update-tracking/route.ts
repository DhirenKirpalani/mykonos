import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dhlClient } from '@/lib/dhl/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max execution time

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Cron Job: Update Tracking Status
 * Polls DHL API for tracking updates on active shipments
 * 
 * Schedule: Every 30 minutes
 * Vercel Cron: 0,30 * * * *
 * 
 * Usage:
 * 1. Add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/update-tracking",
 *        "schedule": "0,30 * * * *"
 *      }]
 *    }
 * 
 * 2. Or call manually: GET /api/cron/update-tracking
 */
export async function GET(request: Request) {
  const startTime = Date.now()
  const cronId = `CRON-${Date.now()}`
  
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🔄 Tracking Update Cron Started [${cronId}]`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⏰ Time:', new Date().toISOString())
    
    // Verify cron secret (optional security - only in production)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Only enforce auth if CRON_SECRET is explicitly set and not empty
    if (cronSecret && cronSecret.trim() !== '' && authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized: Invalid cron secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get all orders with tracking numbers that are not delivered
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, tracking_number, dhl_shipment_number, status, customer_email, shipping_address')
      .in('status', ['pending_shipment', 'shipped'])
      .not('tracking_number', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(50) // Process max 50 orders per run
    
    if (ordersError) {
      console.error('❌ Failed to fetch orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }
    
    console.log(`📦 Found ${orders?.length || 0} orders to check`)
    
    if (!orders || orders.length === 0) {
      console.log('✅ No orders to process')
      return NextResponse.json({ 
        success: true, 
        message: 'No orders to process',
        processed: 0
      })
    }
    
    let updated = 0
    let failed = 0
    let unchanged = 0
    
    // Process each order
    for (const order of orders) {
      const trackingNumber = order.tracking_number || order.dhl_shipment_number
      
      if (!trackingNumber) {
        console.log(`⏭️  Skipping order ${order.order_number}: No tracking number`)
        continue
      }
      
      try {
        console.log(`🔍 Checking ${order.order_number} (${trackingNumber})...`)
        
        // Fetch tracking data from DHL
        const tracking = await dhlClient.trackShipment(trackingNumber)
        
        if (!tracking.shipments || tracking.shipments.length === 0) {
          console.log(`⚠️  No tracking data for ${trackingNumber}`)
          failed++
          continue
        }
        
        const shipment = tracking.shipments[0]
        const events = shipment.events || []
        
        // Check if delivered
        const deliveredEvent = events.find((e: any) => 
          e.description?.toLowerCase().includes('delivered')
        )
        
        if (deliveredEvent && order.status !== 'delivered') {
          console.log(`✅ Order ${order.order_number} is delivered!`)
          
          // Update order to delivered
          const deliveredTime = deliveredEvent.date && deliveredEvent.time 
            ? `${deliveredEvent.date}T${deliveredEvent.time}:00Z`
            : new Date().toISOString()
          
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'delivered',
              delivered_at: deliveredTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)
          
          if (updateError) {
            console.error(`❌ Failed to update ${order.order_number}:`, updateError)
            failed++
          } else {
            updated++
            
            // Send delivery email (optional)
            try {
              await sendDeliveryNotification(order, trackingNumber, deliveredTime)
            } catch (emailError) {
              console.error(`⚠️  Failed to send email for ${order.order_number}`)
            }
          }
        } else if (events.length > 0 && order.status === 'pending_shipment') {
          // Has events but not delivered - mark as shipped
          console.log(`📦 Order ${order.order_number} is now shipped`)
          
          const firstEvent = events[events.length - 1]
          const shippedTime = firstEvent.date && firstEvent.time
            ? `${firstEvent.date}T${firstEvent.time}:00Z`
            : new Date().toISOString()
          
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'shipped',
              shipped_at: shippedTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)
          
          if (updateError) {
            console.error(`❌ Failed to update ${order.order_number}:`, updateError)
            failed++
          } else {
            updated++
          }
        } else {
          console.log(`ℹ️  No status change for ${order.order_number}`)
          unchanged++
        }
        
        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error: any) {
        console.error(`❌ Error processing ${order.order_number}:`, error.message)
        failed++
      }
    }
    
    const duration = Date.now() - startTime
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✨ Cron Job Completed [${cronId}]`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Summary:')
    console.log(`   Total Orders: ${orders.length}`)
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ⏭️  Unchanged: ${unchanged}`)
    console.log(`   ❌ Failed: ${failed}`)
    console.log(`   ⏱️  Duration: ${duration}ms`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    return NextResponse.json({
      success: true,
      message: 'Tracking update completed',
      summary: {
        total: orders.length,
        updated,
        unchanged,
        failed,
        duration
      }
    })
    
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(`💥 Cron Job Failed [${cronId}]`)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('⚠️  Error:', error.message)
    console.error('📚 Stack:', error.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Cron job failed'
      },
      { status: 500 }
    )
  }
}

/**
 * Send delivery notification email
 */
async function sendDeliveryNotification(
  order: any,
  trackingNumber: string,
  deliveredAt: string
) {
  if (!order.customer_email) return
  
  const { sendOrderShippedEmail } = await import('@/lib/email/order-emails')
  
  // You can create a separate sendDeliveryEmail function
  // For now, we'll skip email sending
  console.log(`📧 Would send delivery email to ${order.customer_email}`)
}
