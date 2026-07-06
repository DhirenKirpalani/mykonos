/**
 * Script to register webhook with DHL Express API
 * Run with: npx ts-node scripts/register-dhl-webhook.ts
 */

const DHL_API_KEY = process.env.DHL_API_KEY || ''
const DHL_API_SECRET = process.env.DHL_API_SECRET || ''
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-domain.com/api/webhooks/dhl'

// DHL API endpoint for webhook registration
const DHL_WEBHOOK_API = 'https://express.api.dhl.com/mydhlapi/webhooks/v1/subscriptions'

async function registerWebhook() {
  console.log('🔧 Registering DHL Webhook...')
  console.log('📍 Webhook URL:', WEBHOOK_URL)
  
  // Create Basic Auth header
  const credentials = Buffer.from(`${DHL_API_KEY}:${DHL_API_SECRET}`).toString('base64')
  
  const webhookConfig = {
    url: WEBHOOK_URL,
    events: [
      'shipment.picked-up',
      'shipment.in-transit',
      'shipment.out-for-delivery',
      'shipment.delivered',
      'shipment.exception',
      'shipment.returned'
    ],
    // Optional: Add authentication for your webhook
    headers: {
      'x-webhook-secret': process.env.DHL_WEBHOOK_SECRET || ''
    }
  }
  
  try {
    const response = await fetch(DHL_WEBHOOK_API, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DHL API Error: ${response.status} - ${error}`)
    }
    
    const result = await response.json()
    console.log('✅ Webhook registered successfully!')
    console.log('📋 Subscription ID:', result.subscriptionId || result.id)
    console.log('📦 Events:', result.events)
    console.log('\n💡 Save this subscription ID for future reference')
    
    return result
  } catch (error: any) {
    console.error('❌ Failed to register webhook:', error.message)
    throw error
  }
}

// Run the script
registerWebhook()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error:', error)
    process.exit(1)
  })
