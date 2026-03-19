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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get order by order_number (which is the orderId in callback)
    console.log('🔍 [CALLBACK] Finding order with order_number:', orderId)
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('order_number', orderId)
      .single()
    
    if (!orderData) {
      console.error('❌ [CALLBACK] Order not found:', orderId)
      return NextResponse.redirect(new URL('/checkout?error=order_not_found', request.url))
    }
    
    const order = orderData as any
    console.log('✅ [CALLBACK] Found order ID:', order.id)
    
    // Check payment status
    console.log('🔍 [CALLBACK] Checking transaction status:', transactionStatus)
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      console.log('✅ [CALLBACK] Payment successful, completing order...')
      
      const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('🎫 [CALLBACK] Generated payment intent ID:', paymentIntentId)
      console.log('📝 [CALLBACK] Calling complete_order_payment...')
      
      const { error: completeError } = await supabase.rpc('complete_order_payment', {
        p_order_id: order.id,
        p_payment_intent_id: paymentIntentId,
        p_transaction_status: transactionStatus
      } as any)

      if (completeError) {
        console.error('❌ [CALLBACK] Order completion error:', completeError)
        console.error('❌ [CALLBACK] Error details:', completeError.message, completeError.details, completeError.hint)
        return NextResponse.redirect(new URL('/checkout?error=payment_completion_failed', request.url))
      }
      
      console.log('✅ [CALLBACK] Order payment completed successfully')

      // Redirect to confirmation page
      console.log('🔄 [CALLBACK] Redirecting to confirmation page')
      return NextResponse.redirect(new URL(`/checkout/confirmation?order=${order.order_number}`, request.url))
    } else if (transactionStatus === 'pending') {
      // Payment pending - order already exists, just redirect
      console.log('⏳ [CALLBACK] Payment pending, redirecting to orders...')
      return NextResponse.redirect(new URL(`/account/orders/${order.id}?info=payment_pending`, request.url))
    } else {
      // Payment failed or cancelled - order still exists as pending
      console.log('❌ [CALLBACK] Payment failed or cancelled, status:', transactionStatus)
      return NextResponse.redirect(new URL(`/account/orders/${order.id}?info=payment_failed`, request.url))
    }
  } catch (error) {
    console.error('❌ [CALLBACK] Midtrans callback error:', error)
    console.error('❌ [CALLBACK] Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(new URL('/checkout?error=callback_failed', request.url))
  }
}
