import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(request: Request) {
  try {
    console.log('🔵 [API] POST /api/checkout/complete - Completing checkout')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { checkout_session_id, payment_method_type } = body
    
    console.log('📥 [API] Request body:', { checkout_session_id, payment_method_type })

    if (!checkout_session_id) {
      console.error('❌ [API] Missing checkout_session_id')
      return NextResponse.json(
        { error: 'Checkout session ID required' },
        { status: 400 }
      )
    }

    console.log('🔍 [API] Fetching checkout session...')
    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('id', checkout_session_id)
      .single()

    const typedSession = session as any

    if (sessionError || !typedSession) {
      console.error('❌ [API] Checkout session not found:', sessionError)
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      )
    }
    console.log('✅ [API] Checkout session found')

    if (new Date(typedSession.expires_at) < new Date()) {
      console.error('❌ [API] Checkout session has expired')
      return NextResponse.json(
        { error: 'Checkout session has expired' },
        { status: 400 }
      )
    }

    console.log('📝 [API] Updating payment method type...')
    const updateData: any = { payment_method_type: payment_method_type || null }
    await supabase
      .from('checkout_sessions')
      .update(updateData)
      .eq('id', checkout_session_id)

    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('🎫 [API] Generated payment intent ID:', paymentIntentId)
    console.log('📝 [API] Calling create_order_from_checkout...')
    console.log('📋 [API] Parameters:', { checkout_session_id, payment_intent_id: paymentIntentId })

    const { data: orderId, error: orderError } = await supabase.rpc('create_order_from_checkout', {
      p_checkout_session_id: checkout_session_id,
      p_payment_intent_id: paymentIntentId
    } as any)

    if (orderError) {
      console.error('❌ [API] Order creation error:', orderError)
      console.error('❌ [API] Error details:', orderError.message, orderError.details, orderError.hint)
      throw orderError
    }
    console.log('✅ [API] Order created successfully, ID:', orderId)

    console.log('📋 [API] Fetching order number...')
    const { data: order } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .single()

    const typedOrder = order as any
    console.log('✅ [API] Order number:', typedOrder?.order_number)

    console.log('✅ [API] Checkout completed successfully')
    return NextResponse.json({
      success: true,
      order_id: orderId,
      order_number: typedOrder?.order_number
    })
  } catch (error: any) {
    console.error('❌ [API] Complete checkout error:', error)
    console.error('❌ [API] Error details:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to complete checkout' },
      { status: 500 }
    )
  }
}
