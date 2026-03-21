import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase.rpc('refresh_products_new_badge')

    if (error) {
      console.error('Failed to refresh new badges:', error)
      return NextResponse.json(
        { error: 'Failed to refresh new badges', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully refreshed product new badges',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refresh new badges' },
      { status: 500 }
    )
  }
}
