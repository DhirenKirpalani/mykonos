import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Cron job endpoint to auto-expire pending orders
 * 
 * Setup instructions:
 * 1. Use Vercel Cron Jobs or external service (e.g., cron-job.org)
 * 2. Schedule to run every 5-15 minutes
 * 3. Call: GET /api/cron/expire-orders
 * 4. Add CRON_SECRET to env and verify in production
 * 
 * Example Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-orders",
 *     "schedule": "0 0/10 * * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret in production
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [CRON] Unauthorized cron request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔵 [CRON] Running auto_cancel_expired_orders...')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase.rpc('auto_cancel_expired_orders')

    if (error) {
      console.error('❌ [CRON] Error running auto_cancel_expired_orders:', error)
      throw error
    }

    const expiredCount = data?.[0]?.expired_count || 0
    console.log(`✅ [CRON] Auto-expired ${expiredCount} orders`)

    return NextResponse.json({
      success: true,
      expired_count: expiredCount,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ [CRON] Auto-expire orders error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to expire orders' },
      { status: 500 }
    )
  }
}
