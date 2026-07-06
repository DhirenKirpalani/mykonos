import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkOrderStatus() {
  const orderNumber = 'MYK-20260411-3BFE'
  
  console.log(`🔍 Checking order: ${orderNumber}\n`)
  
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log('📦 Order Status:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Order Number:', order.order_number)
    console.log('Status:', order.status)
    console.log('Shipping Status:', order.shipping_status || 'Not set')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('🚚 DHL Shipment Info:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Tracking Number:', order.tracking_number || 'None')
    console.log('DHL Shipment Number:', order.dhl_shipment_number || 'None')
    console.log('Tracking URL:', order.dhl_tracking_url || 'None')
    console.log('Has Label PDF:', !!order.dhl_label_pdf)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('📅 Timestamps:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Created:', order.created_at)
    console.log('Shipped:', order.shipped_at || 'Not shipped')
    console.log('Delivered:', order.delivered_at || 'Not delivered')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // Determine what should happen
    if (order.dhl_shipment_number && order.status === 'packed') {
      console.log('⚠️  ISSUE FOUND:')
      console.log('   • Order has DHL shipment created')
      console.log('   • But status is still "packed"')
      console.log('   • Should be "shipped"\n')
      console.log('💡 SOLUTION:')
      console.log('   Update order status to "shipped"')
    } else if (!order.dhl_shipment_number) {
      console.log('✅ Order ready for shipment creation')
    } else {
      console.log('✅ Order status looks correct')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkOrderStatus()
