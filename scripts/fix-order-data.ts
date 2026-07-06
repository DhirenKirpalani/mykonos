/**
 * Fix order data - clear fake timestamps and update status based on real DHL data
 * Run with: npx tsx scripts/fix-order-data.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { dhlClient } from '../lib/dhl/client.js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const ORDER_NUMBER = 'MYK-20260411-3BFE' // The order from screenshot

async function fixOrderData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔧 Fixing Order Data')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📦 Order:', ORDER_NUMBER)
  console.log('')

  try {
    // 1. Get the order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', ORDER_NUMBER)
      .single()

    if (fetchError || !order) {
      console.error('❌ Order not found:', fetchError)
      return
    }

    console.log('✅ Order found:', order.id)
    console.log('Current status:', order.status)
    console.log('Tracking number:', order.tracking_number)
    console.log('Shipped at:', order.shipped_at)
    console.log('Delivered at:', order.delivered_at)
    console.log('Internal notes:', order.internal_notes)
    console.log('')

    // 2. Get real DHL data
    if (order.tracking_number) {
      console.log('🔍 Fetching real DHL data...')
      const tracking = await dhlClient.trackShipment(order.tracking_number, {
        trackingView: 'all-checkpoints',
        levelOfDetail: 'shipment'
      })

      const shipment = tracking.shipments?.[0]
      const events = shipment?.events || []

      console.log('📊 DHL Events:', events.length)
      console.log('')

      // 3. Determine correct status based on real events
      let newStatus = 'pending'
      let shippingStatus = null
      let deliveredAt = null
      let shippedAt = null
      let internalNotes = null

      if (events.length === 0) {
        // No events = label created but not picked up
        newStatus = 'processing' // Keep as processing since payment was completed
        shippingStatus = 'pending'
        internalNotes = 'DHL label created. Awaiting pickup.'
      } else {
        // Process events to determine status
        const latestEvent = events[events.length - 1]
        
        for (const event of events) {
          const typeCode = event.typeCode?.toUpperCase()
          
          if (typeCode === 'PU') {
            shippedAt = `${event.date}T${event.time}`
            shippingStatus = 'picked_up'
          }
          
          if (['PL', 'DF', 'AF'].includes(typeCode || '')) {
            shippingStatus = 'in_transit'
          }
          
          if (typeCode === 'WC') {
            shippingStatus = 'out_for_delivery'
          }
          
          if (typeCode === 'OK') {
            deliveredAt = `${event.date}T${event.time}`
            shippingStatus = 'delivered'
            newStatus = 'delivered'
          }
          
          if (typeCode === 'RT') {
            shippingStatus = 'returned'
            newStatus = 'cancelled'
            internalNotes = `Package returned: ${event.description}`
          }
        }
      }

      console.log('📝 New values:')
      console.log('  Status:', newStatus)
      console.log('  Shipping Status:', shippingStatus)
      console.log('  Shipped At:', shippedAt)
      console.log('  Delivered At:', deliveredAt)
      console.log('  Internal Notes:', internalNotes)
      console.log('')

      // 4. Update the order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          shipping_status: shippingStatus,
          shipped_at: shippedAt,
          delivered_at: deliveredAt,
          internal_notes: internalNotes,
          tracking_events: events,
          estimated_delivery_date: shipment?.estimatedDeliveryDate || null,
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('❌ Update failed:', updateError)
        return
      }

      console.log('✅ Order updated successfully!')
      console.log('')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✨ Summary')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('Old Status:', order.status, '→ New Status:', newStatus)
      console.log('Old Shipping:', order.shipping_status || 'none', '→ New:', shippingStatus || 'none')
      console.log('Fake timestamps cleared:', !shippedAt && !deliveredAt ? 'Yes' : 'No')
      console.log('Real DHL events stored:', events.length)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    } else {
      console.log('⚠️  No tracking number found')
    }

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ Error:', error.message)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}

fixOrderData()
