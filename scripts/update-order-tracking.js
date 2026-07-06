#!/usr/bin/env node

/**
 * Update order tracking number for testing
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateOrderTracking() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 Updating Order Tracking Number')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // Update order with test tracking number
  const { data, error } = await supabase
    .from('orders')
    .update({
      tracking_number: 'TEST-123456',
      dhl_shipment_number: 'TEST-123456',
      tracking_url: 'https://www.dhl.com/track?awb=TEST-123456',
      status: 'shipped',
      updated_at: new Date().toISOString()
    })
    .eq('order_number', 'MYK-20260411-F038')
    .select()

  if (error) {
    console.error('❌ Error updating order:', error)
    process.exit(1)
  }

  console.log('✅ Order updated successfully!')
  console.log('')
  console.log('📦 Updated Order:')
  console.log('   Order Number:', data[0]?.order_number)
  console.log('   Tracking Number:', data[0]?.tracking_number)
  console.log('   Status:', data[0]?.status)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

updateOrderTracking()
