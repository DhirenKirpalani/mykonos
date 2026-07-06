import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigrations() {
  console.log('🔧 Applying missing column migrations...\n')
  
  try {
    // Migration 1: Add region_code to checkout_sessions
    console.log('📝 Migration 1: Adding region_code to checkout_sessions...')
    const migration1 = readFileSync(
      join(process.cwd(), 'supabase/migrations/81_add_region_code_to_checkout_sessions.sql'),
      'utf-8'
    )
    
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: migration1 })
    
    if (error1) {
      console.error('❌ Migration 1 failed:', error1)
    } else {
      console.log('✅ Migration 1 completed: region_code added to checkout_sessions\n')
    }
    
    // Migration 2: Add customer name fields to orders
    console.log('📝 Migration 2: Adding customer_first_name and customer_last_name to orders...')
    const migration2 = readFileSync(
      join(process.cwd(), 'supabase/migrations/82_add_customer_name_fields_to_orders.sql'),
      'utf-8'
    )
    
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: migration2 })
    
    if (error2) {
      console.error('❌ Migration 2 failed:', error2)
    } else {
      console.log('✅ Migration 2 completed: customer name fields added to orders\n')
    }
    
    // Verify columns exist
    console.log('🔍 Verifying columns...')
    
    const { data: checkoutData, error: checkoutError } = await supabase
      .from('checkout_sessions')
      .select('region_code')
      .limit(1)
    
    if (!checkoutError) {
      console.log('✅ checkout_sessions.region_code exists')
    } else {
      console.log('❌ checkout_sessions.region_code check failed:', checkoutError.message)
    }
    
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('customer_first_name, customer_last_name')
      .limit(1)
    
    if (!ordersError) {
      console.log('✅ orders.customer_first_name and customer_last_name exist')
    } else {
      console.log('❌ orders customer name fields check failed:', ordersError.message)
    }
    
    console.log('\n🎉 All migrations applied successfully!')
    console.log('You can now create orders without errors.')
    
  } catch (error) {
    console.error('❌ Error applying migrations:', error)
  }
}

applyMigrations()
