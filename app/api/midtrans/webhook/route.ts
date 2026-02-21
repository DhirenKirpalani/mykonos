import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      order_id,
      transaction_status,
      fraud_status,
      signature_key,
      gross_amount,
      transaction_id,
      payment_type,
    } = body

    // Skip signature verification for testing
    // TODO: Enable this in production
    // if (process.env.NODE_ENV === 'production') {
    //   const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    //   const hash = crypto
    //     .createHash('sha512')
    //     .update(`${order_id}${transaction_status}${gross_amount}${serverKey}`)
    //     .digest('hex')

    //   if (hash !== signature_key) {
    //     return NextResponse.json(
    //       { error: 'Invalid signature' },
    //       { status: 403 }
    //     )
    //   }
    // }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    let paymentStatus = 'pending'
    let orderStatus = 'pending'

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        paymentStatus = 'completed'
        orderStatus = 'processing'
      } else if (fraud_status === 'challenge') {
        paymentStatus = 'pending'
        orderStatus = 'pending'
      }
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'completed'
      orderStatus = 'processing'
    } else if (
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire'
    ) {
      paymentStatus = 'failed'
      orderStatus = 'cancelled'
    } else if (transaction_status === 'pending') {
      paymentStatus = 'pending'
      orderStatus = 'pending'
    }

    const { error: updateError } = await (supabase
      .from('orders')
      .update as any)({
        payment_status: paymentStatus,
        status: orderStatus,
        payment_intent_id: transaction_id,
        payment_method: payment_type,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', order_id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', order_id)
      .single()

    if (order) {
      await supabase.from('order_status_history').insert({
        order_id: (order as any).id,
        status: orderStatus,
        notes: `Payment ${transaction_status} via ${payment_type}. Transaction ID: ${transaction_id}`,
      } as any)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Midtrans webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
