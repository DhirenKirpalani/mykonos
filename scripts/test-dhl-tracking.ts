/**
 * Test script to check real DHL tracking status
 * Run with: npx tsx scripts/test-dhl-tracking.ts
 */

import 'dotenv/config'
import { dhlClient } from '../lib/dhl/client.js'

const TRACKING_NUMBER = '2040430405'

async function testTracking() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 Testing DHL Tracking')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📦 Tracking Number:', TRACKING_NUMBER)
  console.log('')

  try {
    const tracking = await dhlClient.trackShipment(TRACKING_NUMBER, {
      trackingView: 'all-checkpoints',
      levelOfDetail: 'shipment'
    })

    console.log('✅ DHL API Response:')
    console.log(JSON.stringify(tracking, null, 2))
    console.log('')

    if (tracking.shipments && tracking.shipments.length > 0) {
      const shipment = tracking.shipments[0]
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📊 Shipment Summary')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('Status:', shipment.status)
      console.log('Product Code:', shipment.productCode)
      console.log('Description:', shipment.description)
      console.log('Estimated Delivery:', shipment.estimatedDeliveryDate || 'N/A')
      console.log('')

      if (shipment.events && shipment.events.length > 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📅 Tracking Events')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        shipment.events.forEach((event, index) => {
          console.log(`\n${index + 1}. ${event.description}`)
          console.log(`   Date: ${event.date} ${event.time}`)
          console.log(`   Type Code: ${event.typeCode}`)
          console.log(`   Location: ${event.serviceArea?.[0]?.description || 'N/A'}`)
          if (event.signedBy) {
            console.log(`   Signed By: ${event.signedBy}`)
          }
        })
      } else {
        console.log('⚠️  No tracking events found')
      }
    } else {
      console.log('❌ No shipment data found')
    }

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ Error')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Message:', error.message)
    console.error('Details:', error)
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✨ Test Complete')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

testTracking()
