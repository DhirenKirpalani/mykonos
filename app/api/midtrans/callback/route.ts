import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { sendOrderConfirmationEmail } from '@/lib/email/order-emails'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Midtrans callback handler
 * Completes order and redirects user to confirmation page
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n\n=== 🔵 [CALLBACK] MIDTRANS CALLBACK RECEIVED ===')
    console.log('🔵 [CALLBACK] Timestamp:', new Date().toISOString())
    console.log('🔵 [CALLBACK] Full URL:', request.url)
    
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('order_id') // This is the checkout_session_id
    const statusCode = searchParams.get('status_code')
    const transactionStatus = searchParams.get('transaction_status')
    
    console.log('📥 [CALLBACK] Callback params:', { orderId, statusCode, transactionStatus })
    console.log('📥 [CALLBACK] All params:', Object.fromEntries(searchParams.entries()))

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
        return NextResponse.redirect(new URL(`/account/orders/${order.id}?error=payment_completion_failed`, request.url))
      }
      
      console.log('✅ [CALLBACK] Order payment completed successfully')
      
      // ✅ Send email + notification immediately (do NOT rely only on webhook)
      console.log('\n=== 📧 [CALLBACK] EMAIL SENDING START ===')
      console.log('📧 [CALLBACK] Fetching order details for email...')
      console.log('📧 [CALLBACK] Order ID:', order.id)
      
      const { data: fullOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_number, customer_email, user_id, shipping_address, payment_status, email_thread_id')
        .eq('id', order.id)
        .single()
      
      console.log('📧 [CALLBACK] Order fetch result:', { 
        found: !!fullOrder, 
        error: fetchError?.message,
        order_number: fullOrder?.order_number,
        customer_email: fullOrder?.customer_email,
        email_thread_id: fullOrder?.email_thread_id || 'NONE'
      })
      
      if (fullOrder?.email_thread_id) {
        console.log('🔗 [CALLBACK] Found existing email thread ID - will thread with pending payment email')
      } else {
        console.log('⚠️ [CALLBACK] No email thread ID found - this will create a new thread')
      }
      
      if (fullOrder) {
        const typedOrder = fullOrder as any
        
        // Get customer name
        console.log('👤 [CALLBACK] Fetching customer name for user_id:', typedOrder.user_id)
        let customerName = 'Customer'
        if (typedOrder.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', typedOrder.user_id)
            .single()
          
          if (userData && (userData.first_name || userData.last_name)) {
            customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
            console.log('✅ [CALLBACK] Customer name from users table:', customerName)
          }
        }
        if (customerName === 'Customer') {
          const addr = typedOrder.shipping_address || {}
          customerName = addr.full_name || typedOrder.customer_email?.split('@')[0] || 'Customer'
          console.log('⚠️ [CALLBACK] Using fallback customer name:', customerName)
        }
        
        // Send email immediately (BLOCKING to ensure it completes)
        if (!typedOrder.customer_email) {
          console.error('❌ [CALLBACK] NO CUSTOMER EMAIL - Cannot send email!')
          console.error('❌ [CALLBACK] Order data:', typedOrder)
        } else {
          console.log('\n📧 [CALLBACK] SENDING PAYMENT SUCCESS EMAIL')
          console.log('📧 [CALLBACK] To:', typedOrder.customer_email)
          console.log('📧 [CALLBACK] Name:', customerName)
          console.log('📧 [CALLBACK] Order:', typedOrder.order_number)
          console.log('📧 [CALLBACK] Order ID:', typedOrder.id)
          
          try {
            const emailResult = await sendOrderConfirmationEmail({
              orderId: typedOrder.id,
              orderNumber: typedOrder.order_number,
              customerEmail: typedOrder.customer_email,
              customerName: customerName
            })
            
            console.log('✅✅✅ [CALLBACK] PAYMENT SUCCESS EMAIL SENT!')
            console.log('✅ [CALLBACK] Email result:', emailResult)
            console.log('=== 📧 [CALLBACK] EMAIL SENDING END (SUCCESS) ===\n')
          } catch (err: any) {
            console.error('\n❌❌❌ [CALLBACK] EMAIL SEND FAILED!')
            console.error('❌ [CALLBACK] Error:', err)
            console.error('❌ [CALLBACK] Error message:', err?.message)
            console.error('❌ [CALLBACK] Error stack:', err?.stack)
            console.error('=== 📧 [CALLBACK] EMAIL SENDING END (FAILED) ===\n')
          }
        }
        
        // Create notification immediately
        if (typedOrder.user_id) {
          console.log('🔔 [CALLBACK] Creating payment success notification...')
          supabase.from('notifications').insert({
            user_id: typedOrder.user_id,
            title: 'Payment Successful! 🎉',
            message: `Your payment for order #${typedOrder.order_number} has been confirmed. Your order is now being processed.`,
            type: 'payment',
            link: `/account/orders/${typedOrder.id}`,
            read: false
          } as any).then(({ error }) => {
            if (error) console.error('❌ [CALLBACK] Failed to create notification:', error)
            else console.log('✅ [CALLBACK] Notification created successfully')
          })
        }
      }

      // Redirect to track order page (works for both guest and authenticated users)
      console.log('🔄 [CALLBACK] Redirecting to track order page')
      return NextResponse.redirect(new URL(`/track-order?success=true`, request.url))
    } else if (transactionStatus === 'pending') {
      // Payment pending - order already exists, just redirect
      console.log('⏳ [CALLBACK] Payment pending, redirecting to track order...')
      return NextResponse.redirect(new URL(`/track-order?info=payment_pending`, request.url))
    } else {
      // Payment failed or cancelled - order still exists as pending
      console.log('❌ [CALLBACK] Payment failed or cancelled, status:', transactionStatus)
      return NextResponse.redirect(new URL(`/track-order?info=payment_failed`, request.url))
    }
  } catch (error) {
    console.error('❌ [CALLBACK] Midtrans callback error:', error)
    console.error('❌ [CALLBACK] Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(new URL('/checkout?error=callback_failed', request.url))
  }
}
