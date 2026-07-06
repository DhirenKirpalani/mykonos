import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPickupConfig() {
  console.log('🔍 Testing DHL Pickup Configuration...\n')
  
  try {
    const { data: pickupSetting, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'dhl_auto_pickup')
      .single()
    
    if (error) {
      console.error('❌ Error fetching setting:', error)
      return
    }
    
    console.log('✅ DHL Auto-Pickup Settings:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Enabled:', pickupSetting?.setting_value?.enabled ?? false)
    console.log('Close Time:', pickupSetting?.setting_value?.closeTime ?? 'Not set')
    console.log('Location:', pickupSetting?.setting_value?.location ?? 'Not set')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    if (pickupSetting?.setting_value?.enabled) {
      console.log('✅ Auto-pickup is ENABLED')
      console.log(`📍 DHL will pick up from: ${pickupSetting.setting_value.location}`)
      console.log(`⏰ Before: ${pickupSetting.setting_value.closeTime}`)
    } else {
      console.log('⚠️  Auto-pickup is DISABLED')
      console.log('Enable it in CMS → Settings to use automatic pickup')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testPickupConfig()
