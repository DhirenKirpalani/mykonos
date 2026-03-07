import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Midtrans callback handler
 * Completes order and redirects user to confirmation page
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('order_id') // This is the checkout_session_id
    const statusCode = searchParams.get('status_code')
    const transactionStatus = searchParams.get('transaction_status')

    if (!orderId) {
      return NextResponse.redirect(new URL('/checkout?error=missing_order_id', request.url))
    }

    // Check payment status
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      // Payment successful - complete the order
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data: orderIdResult, error: orderError } = await supabase.rpc('create_order_from_checkout', {
        p_checkout_session_id: orderId,
        p_payment_intent_id: paymentIntentId
      } as any)

      if (orderError) {
        console.error('Order creation error:', orderError)
        return NextResponse.redirect(new URL('/checkout?error=order_creation_failed', request.url))
      }

      // Get order number
      const { data: order } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderIdResult)
        .single()

      const typedOrder = order as any

      // Redirect to confirmation page
      return NextResponse.redirect(new URL(`/checkout/confirmation?order=${typedOrder?.order_number}`, request.url))
    } else if (transactionStatus === 'pending') {
      // Payment pending
      return NextResponse.redirect(new URL(`/checkout?info=payment_pending`, request.url))
    } else {
      // Payment failed or cancelled
      return NextResponse.redirect(new URL(`/checkout?error=payment_failed`, request.url))
    }
  } catch (error) {
    console.error('Midtrans callback error:', error)
    return NextResponse.redirect(new URL('/checkout?error=callback_failed', request.url))
  }
}
