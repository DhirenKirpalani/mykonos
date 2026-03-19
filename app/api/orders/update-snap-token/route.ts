import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Update snap_token for an existing order
 */
export async function POST(request: Request) {
  try {
    console.log('🔵 [API] POST /api/orders/update-snap-token')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { order_id, snap_token, snap_redirect_url } = body
    
    console.log('📥 [API] Request body:', { order_id })

    if (!order_id || !snap_token) {
      console.error('❌ [API] Missing required fields')
      return NextResponse.json(
        { error: 'order_id and snap_token required' },
        { status: 400 }
      )
    }

    // Update order with snap_token
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        snap_token,
        snap_redirect_url,
      })
      .eq('id', order_id)

    if (updateError) {
      console.error('❌ [API] Failed to update snap_token:', updateError)
      throw updateError
    }

    console.log('✅ [API] snap_token updated successfully')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ [API] Update snap_token error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update snap_token' },
      { status: 500 }
    )
  }
}
