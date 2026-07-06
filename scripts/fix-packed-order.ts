import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixPackedOrder() {
  const orderNumber = 'MYK-20260411-3BFE'
  
  console.log(`🔧 Fixing order: ${orderNumber}\n`)
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        shipping_status: 'shipped',
        shipped_at: new Date().toISOString()
      })
      .eq('order_number', orderNumber)
      .select()
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log('✅ Order status updated!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Status: packed → shipped')
    console.log('Shipping Status: pending → shipped')
    console.log('Shipped At:', data[0].shipped_at)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('🎉 Order is now in "Shipped" status!')
    console.log('   • DHL shipping details will now be visible in CMS')
    console.log('   • Order will appear in "Shipped" tab')
    console.log('   • Tracking is active: 2040430405')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixPackedOrder()
