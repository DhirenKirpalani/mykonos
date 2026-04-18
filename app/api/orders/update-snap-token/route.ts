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
    console.log('🔵 [TOKEN API DEBUG] POST /api/orders/update-snap-token')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { order_id, snap_token, snap_redirect_url } = body
    
    console.log('📥 [TOKEN API DEBUG] Request received:', {
      order_id,
      has_snap_token: !!snap_token,
      snap_token_length: snap_token?.length || 0,
      snap_token_preview: snap_token ? snap_token.substring(0, 20) + '...' : 'NULL',
      has_redirect_url: !!snap_redirect_url
    })

    if (!order_id || !snap_token) {
      console.error('❌ [TOKEN API DEBUG] Missing required fields!', {
        has_order_id: !!order_id,
        has_snap_token: !!snap_token
      })
      return NextResponse.json(
        { error: 'order_id and snap_token required' },
        { status: 400 }
      )
    }

    // First, check if order exists
    console.log('🔍 [TOKEN API DEBUG] Checking if order exists...')
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, snap_token')
      .eq('id', order_id)
      .single()

    if (fetchError || !existingOrder) {
      console.error('❌ [TOKEN API DEBUG] Order not found!', {
        order_id,
        error: fetchError?.message
      })
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    console.log('✅ [TOKEN API DEBUG] Order found:', {
      order_number: existingOrder.order_number,
      payment_status: existingOrder.payment_status,
      currently_has_token: !!existingOrder.snap_token
    })

    // Update order with snap_token
    console.log('💾 [TOKEN API DEBUG] Updating order with snap_token...')
    const { data: updateData, error: updateError } = await supabase
      .from('orders')
      .update({
        snap_token,
        snap_redirect_url,
        payment_gateway: 'midtrans',
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .eq('id', order_id)
      .select()

    if (updateError) {
      console.error('❌ [TOKEN API DEBUG] Database update failed!', {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        order_id
      })
      throw updateError
    }

    console.log('✅ [TOKEN API DEBUG] snap_token updated successfully!', {
      order_id,
      updated_rows: updateData?.length || 0
    })

    return NextResponse.json({ 
      success: true,
      order_id,
      updated: true
    })
  } catch (error: any) {
    console.error('❌ [TOKEN API DEBUG] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { error: error.message || 'Failed to update snap_token' },
      { status: 500 }
    )
  }
}
