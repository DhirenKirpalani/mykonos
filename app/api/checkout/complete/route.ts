import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(request: Request) {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { checkout_session_id, payment_method_type } = body

    if (!checkout_session_id) {
      return NextResponse.json(
        { error: 'Checkout session ID required' },
        { status: 400 }
      )
    }

    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('id', checkout_session_id)
      .single()

    const typedSession = session as any

    if (sessionError || !typedSession) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      )
    }

    if (new Date(typedSession.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Checkout session has expired' },
        { status: 400 }
      )
    }

    await supabase
      .from('checkout_sessions')
      .update({ payment_method_type } as any)
      .eq('id', checkout_session_id)

    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { data: orderId, error: orderError } = await supabase.rpc('create_order_from_checkout', {
      p_checkout_session_id: checkout_session_id,
      p_payment_intent_id: paymentIntentId
    } as any)

    if (orderError) throw orderError

    const { data: order } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .single()

    const typedOrder = order as any

    return NextResponse.json({
      success: true,
      order_id: orderId,
      order_number: typedOrder?.order_number
    })
  } catch (error: any) {
    console.error('Complete checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete checkout' },
      { status: 500 }
    )
  }
}
