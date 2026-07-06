import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updatePickupConfig() {
  console.log('🔧 Updating DHL Pickup Configuration...\n')
  
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .update({
        setting_value: {
          enabled: true,
          closeTime: '18:00',
          location: 'reception'
        }
      })
      .eq('setting_key', 'dhl_auto_pickup')
      .select()
    
    if (error) {
      console.error('❌ Error updating setting:', error)
      return
    }
    
    console.log('✅ Successfully updated DHL pickup configuration!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Setting:', data[0])
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('✅ Configuration:')
    console.log('  • Enabled: true')
    console.log('  • Close Time: 18:00')
    console.log('  • Location: reception')
    console.log('\n🎉 DHL will now pick up packages from reception before 18:00!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

updatePickupConfig()
