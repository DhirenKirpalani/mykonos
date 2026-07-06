/**
 * Mock DHL Webhook Testing Script
 * Simulates DHL webhook events for testing
 * 
 * Usage:
 * npx ts-node scripts/test-dhl-webhook.ts [event] [tracking-number]
 * 
 * Examples:
 * npx ts-node scripts/test-dhl-webhook.ts picked-up 2518074510
 * npx ts-node scripts/test-dhl-webhook.ts delivered 2518074510
 */

const TEST_WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/dhl'

// Available event types
const EVENTS = {
  'picked-up': 'shipment-picked-up',
  'transit': 'shipment-in-transit',
  'out-for-delivery': 'shipment-out-for-delivery',
  'delivered': 'shipment-delivered',
  'exception': 'shipment-exception',
  'returned': 'shipment-returned'
}

// Mock webhook payloads for different events
function createMockPayload(event: string, trackingNumber: string) {
  const timestamp = new Date().toISOString()
  
  const basePayload = {
    event,
    trackingNumber,
    timestamp,
    shipmentId: `SHIP-${Math.random().toString(36).substring(7)}`,
    origin: {
      address: {
        countryCode: 'ID',
        cityName: 'Jakarta'
      }
    },
    destination: {
      address: {
        countryCode: 'ID',
        cityName: 'Jakarta'
      }
    }
  }
  
  // Add event-specific data
  switch (event) {
    case 'shipment-picked-up':
      return {
        ...basePayload,
        description: 'Shipment has been picked up',
        location: 'Jakarta Distribution Center',
        nextSteps: 'Package is being processed for transit'
      }
      
    case 'shipment-in-transit':
      return {
        ...basePayload,
        description: 'Shipment is in transit',
        location: 'Jakarta Sorting Facility',
        nextSteps: 'Package will be delivered soon'
      }
      
    case 'shipment-out-for-delivery':
      return {
        ...basePayload,
        description: 'Shipment is out for delivery',
        location: 'Jakarta Pusat Delivery Hub',
        courierName: 'Ahmad Rizki',
        estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      }
      
    case 'shipment-delivered':
      return {
        ...basePayload,
        description: 'Shipment has been delivered',
        location: 'Customer Address',
        signedBy: 'Customer',
        deliveryProof: 'Signature received',
        deliveredAt: timestamp
      }
      
    case 'shipment-exception':
      return {
        ...basePayload,
        description: 'Delivery exception occurred',
        exceptionCode: 'ADDRESS_ISSUE',
        exceptionReason: 'Customer not available',
        nextAttempt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      }
      
    case 'shipment-returned':
      return {
        ...basePayload,
        description: 'Shipment is being returned to sender',
        returnReason: 'Customer refused delivery',
        returnLocation: 'Jakarta Distribution Center'
      }
      
    default:
      return basePayload
  }
}

async function sendMockWebhook(event: string, trackingNumber: string) {
  const eventType = EVENTS[event as keyof typeof EVENTS]
  
  if (!eventType) {
    console.error('❌ Invalid event type. Available events:')
    Object.keys(EVENTS).forEach(key => {
      console.log(`   - ${key}`)
    })
    process.exit(1)
  }
  
  const payload = createMockPayload(eventType, trackingNumber)
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 Sending Mock DHL Webhook')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📍 Webhook URL:', TEST_WEBHOOK_URL)
  console.log('📦 Event:', eventType)
  console.log('🔢 Tracking Number:', trackingNumber)
  console.log('')
  console.log('📋 Payload:')
  console.log(JSON.stringify(payload, null, 2))
  console.log('')
  
  try {
    const response = await fetch(TEST_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dhl-signature': 'mock-signature-for-testing'
      },
      body: JSON.stringify(payload)
    })
    
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📡 Response')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Status:', response.status, response.statusText)
    console.log('')
    console.log('Body:')
    console.log(JSON.stringify(responseData, null, 2))
    console.log('')
    
    if (response.ok) {
      console.log('✅ Webhook sent successfully!')
      console.log('')
      console.log('💡 Check your:')
      console.log('   - Server logs for webhook processing')
      console.log('   - Database for order status updates')
      console.log('   - Email inbox for notifications')
    } else {
      console.log('❌ Webhook failed!')
      console.log('Check your server logs for errors')
    }
    
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💥 Error sending webhook')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Message:', error.message)
    console.error('')
    console.error('💡 Make sure your server is running:')
    console.error('   npm run dev')
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const eventArg = args[0] || 'delivered'
const trackingNumber = args[1] || '2518074510'

console.log('')
sendMockWebhook(eventArg, trackingNumber)
  .then(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✨ Done!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
