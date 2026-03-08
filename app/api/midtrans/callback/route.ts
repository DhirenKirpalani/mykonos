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
    console.log('🔵 [CALLBACK] Midtrans callback received')
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('order_id') // This is the checkout_session_id
    const statusCode = searchParams.get('status_code')
    const transactionStatus = searchParams.get('transaction_status')
    
    console.log('📥 [CALLBACK] Callback params:', { orderId, statusCode, transactionStatus })

    if (!orderId) {
      console.error('❌ [CALLBACK] Missing order_id parameter')
      return NextResponse.redirect(new URL('/checkout?error=missing_order_id', request.url))
    }

    // Check payment status
    console.log('🔍 [CALLBACK] Checking transaction status:', transactionStatus)
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      console.log('✅ [CALLBACK] Payment successful, creating order...')
      // Payment successful - complete the order
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('🎫 [CALLBACK] Generated payment intent ID:', paymentIntentId)
      console.log('📝 [CALLBACK] Calling create_order_from_checkout...')
      console.log('📋 [CALLBACK] Parameters:', { checkout_session_id: orderId, payment_intent_id: paymentIntentId })
      
      const { data: orderIdResult, error: orderError } = await supabase.rpc('create_order_from_checkout', {
        p_checkout_session_id: orderId,
        p_payment_intent_id: paymentIntentId
      } as any)

      if (orderError) {
        console.error('❌ [CALLBACK] Order creation error:', orderError)
        console.error('❌ [CALLBACK] Error details:', orderError.message, orderError.details, orderError.hint)
        return NextResponse.redirect(new URL('/checkout?error=order_creation_failed', request.url))
      }
      
      console.log('✅ [CALLBACK] Order created successfully, ID:', orderIdResult)

      // Get order number
      console.log('📋 [CALLBACK] Fetching order number...')
      const { data: order } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderIdResult)
        .single()

      const typedOrder = order as any
      console.log('✅ [CALLBACK] Order number:', typedOrder?.order_number)

      // Redirect to confirmation page
      console.log('🔄 [CALLBACK] Redirecting to confirmation page')
      return NextResponse.redirect(new URL(`/checkout/confirmation?order=${typedOrder?.order_number}`, request.url))
    } else if (transactionStatus === 'pending') {
      // Payment pending
      console.log('⏳ [CALLBACK] Payment pending, redirecting...')
      return NextResponse.redirect(new URL(`/checkout?info=payment_pending`, request.url))
    } else {
      // Payment failed or cancelled
      console.log('❌ [CALLBACK] Payment failed or cancelled, status:', transactionStatus)
      return NextResponse.redirect(new URL(`/checkout?error=payment_failed`, request.url))
    }
  } catch (error) {
    console.error('❌ [CALLBACK] Midtrans callback error:', error)
    console.error('❌ [CALLBACK] Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(new URL('/checkout?error=callback_failed', request.url))
  }
}
