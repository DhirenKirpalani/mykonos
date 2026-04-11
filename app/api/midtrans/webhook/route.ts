import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import crypto from 'crypto'
import { sendPaymentStatusUpdateEmail, sendOrderStatusUpdateEmail } from '@/lib/email/order-emails'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== MIDTRANS WEBHOOK RECEIVED ===')
    console.log('Full Midtrans payload:', JSON.stringify(body, null, 2))
    
    const {
      order_id,
      transaction_status,
      status_code,
      fraud_status,
      signature_key,
      gross_amount,
      currency,
      transaction_id,
      payment_type,
      bank,
      card_type,
      masked_card,
      acquirer,
      channel_response_code,
      channel_response_message,
      expiry_time,
      transaction_time,
    } = body
    
    console.log('Extracted payment details:', {
      order_id,
      transaction_id,
      payment_type,
      transaction_status,
      fraud_status,
      bank,
      card_type,
      masked_card,
      acquirer,
      expiry_time,
      transaction_time,
    })

    // ✅ Payment Verification - Verify signature to prevent fraud
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    
    if (!serverKey) {
      console.error('❌ MIDTRANS_SERVER_KEY not set - cannot verify signature')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    const hash = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex')

    console.log('🔐 [WEBHOOK] Signature verification:', {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      server_key_prefix: serverKey.substring(0, 10),
      expected_hash: hash.substring(0, 20) + '...',
      received_signature: signature_key.substring(0, 20) + '...',
      match: hash === signature_key
    })

    if (hash !== signature_key) {
      console.error('❌ [WEBHOOK] Invalid signature - rejecting request (potential fraud attempt)')
      console.error('Expected hash:', hash.substring(0, 20) + '...')
      console.error('Received signature:', signature_key?.substring(0, 20) + '...')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    console.log('✅ [WEBHOOK] Signature verified successfully')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    console.log('Supabase config:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl?.substring(0, 20)
    })
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Processing payment status for order:', order_id)
    
    // Both guest and logged-in users now send order_number (e.g., MYK-20260322-D498)
    console.log('Looking up order by order_number:', order_id)
    const { data: orderData } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', order_id)
      .single()
    
    if (!orderData) {
      console.error('Order not found with order_number:', order_id)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    const orderId = (orderData as any).id
    console.log('Found order ID:', orderId, 'for order_number:', order_id)
    
    // ✅ Idempotency Check - Prevent duplicate webhook processing
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('payment_status, total_amount')
      .eq('id', orderId)
      .single()
    
    if (!currentOrder) {
      console.error('Order not found in idempotency check:', orderId)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    const typedCurrentOrder = currentOrder as any
    
    // If already completed, ignore duplicate webhook
    if (typedCurrentOrder.payment_status === 'completed') {
      console.log('⚠️ Webhook already processed - order already completed, ignoring duplicate')
      return NextResponse.json({ 
        success: true, 
        message: 'Already processed',
        order_id: orderId 
      })
    }
    
    // Verify gross_amount matches order total (fraud prevention)
    // Only apply to actual payment confirmation events, not expire/cancel/deny
    const paymentConfirmationStatuses = ['capture', 'settlement']
    if (paymentConfirmationStatuses.includes(transaction_status)) {
      const expectedAmount = Math.round(typedCurrentOrder.total_amount)
      const receivedAmount = Math.round(parseFloat(gross_amount))
      if (expectedAmount !== receivedAmount) {
        console.error('❌ Amount mismatch - potential fraud', {
          expected: expectedAmount,
          received: receivedAmount
        })
        return NextResponse.json(
          { error: 'Amount mismatch' },
          { status: 400 }
        )
      }
    }
    
    // Use the new complete_order_payment function with amount verification
    console.log('📞 [WEBHOOK] Calling complete_order_payment with params:', {
      order_id: orderId,
      transaction_id,
      transaction_status,
      gross_amount: parseFloat(gross_amount),
      currency
    })
    
    const { error: completeError } = await supabase.rpc('complete_order_payment', {
      p_order_id: orderId,
      p_payment_intent_id: transaction_id,
      p_transaction_status: transaction_status,
      p_gross_amount: parseFloat(gross_amount),
      p_currency: currency
    } as any)
    
    if (completeError) {
      console.error('❌ [WEBHOOK] Failed to complete order payment:', completeError)
      console.error('❌ [WEBHOOK] Error details:', JSON.stringify(completeError, null, 2))
      return NextResponse.json(
        { error: 'Failed to complete order payment' },
        { status: 500 }
      )
    }
    
    console.log('✅ [WEBHOOK] Order payment completed successfully')
    
    // Update additional payment metadata
    const cardLast4 = masked_card ? masked_card.slice(-4) : null
    const metadataUpdate: any = {
      midtrans_order_id: order_id,
      midtrans_transaction_id: transaction_id,
      payment_method_type: payment_type,
      payment_channel: bank || acquirer,
      card_type: card_type,
      card_last4: cardLast4,
      payment_metadata: body,
    }
    
    // If Midtrans provides expiry_time, update it in the order
    if (expiry_time) {
      metadataUpdate.expiry_time = expiry_time
      console.log('📅 [WEBHOOK] Updating expiry_time from Midtrans:', expiry_time)
    }
    
    await supabase
      .from('orders')
      .update(metadataUpdate)
      .eq('id', orderId)

    // Get updated order data with shipping address
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, user_id, payment_status, status, order_number, customer_email, shipping_address')
      .eq('id', orderId)
      .single()
    
    if (orderFetchError) {
      console.error('❌ [WEBHOOK] Failed to fetch updated order:', orderFetchError)
    } else {
      console.log('✅ [WEBHOOK] Updated order data:', {
        order_number: order.order_number,
        payment_status: order.payment_status,
        status: order.status,
        user_id: order.user_id
      })
    }

    if (order) {
      const typedOrder = order as any
      
      // Get customer name from user profile or shipping address
      let customerName = 'Customer'
      
      if (typedOrder.user_id) {
        console.log('👤 [WEBHOOK] Fetching user data for user_id:', typedOrder.user_id)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', typedOrder.user_id)
          .single()
        
        if (userData && (userData.first_name || userData.last_name)) {
          customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
          console.log('✅ [WEBHOOK] Customer name from users table:', customerName)
        }
      }
      
      // Fallback to shipping address name or email username
      if (customerName === 'Customer') {
        const shippingAddress = typedOrder.shipping_address || {}
        customerName = shippingAddress.full_name || typedOrder.customer_email?.split('@')[0] || 'Customer'
        console.log('⚠️ [WEBHOOK] Using fallback customer name:', customerName)
      }
      
      // Send email notification for payment status update
      console.log('\n🔍 [WEBHOOK EMAIL DEBUG] Starting email check...')
      console.log('🔍 [WEBHOOK EMAIL DEBUG] Customer Email:', typedOrder.customer_email)
      console.log('🔍 [WEBHOOK EMAIL DEBUG] Customer Name:', customerName)
      console.log('🔍 [WEBHOOK EMAIL DEBUG] Transaction Status:', transaction_status)
      console.log('🔍 [WEBHOOK EMAIL DEBUG] Payment Status:', typedOrder.payment_status)
      
      if (!typedOrder.customer_email) {
        console.error('❌ [WEBHOOK EMAIL DEBUG] NO CUSTOMER EMAIL - Cannot send email!')
      } else {
        const criticalEmailStates = ['capture', 'settlement', 'deny', 'cancel', 'expire']
        console.log('🔍 [WEBHOOK EMAIL DEBUG] Critical email states:', criticalEmailStates)
        console.log('🔍 [WEBHOOK EMAIL DEBUG] Is transaction_status in critical states?', criticalEmailStates.includes(transaction_status))
        
        if (criticalEmailStates.includes(transaction_status)) {
          console.log('\n✅ [WEBHOOK EMAIL DEBUG] TRIGGERING EMAIL SEND!')
          console.log('📧 [WEBHOOK] Sending payment status email...')
          console.log('📧 [WEBHOOK] Email data:', {
            orderId: typedOrder.id,
            orderNumber: typedOrder.order_number,
            customerEmail: typedOrder.customer_email,
            customerName: customerName,
            paymentStatus: typedOrder.payment_status,
            transactionStatus: transaction_status
          })
          
          const emailPromise = sendPaymentStatusUpdateEmail({
            orderId: typedOrder.id,
            orderNumber: typedOrder.order_number,
            customerEmail: typedOrder.customer_email,
            customerName: customerName,
            paymentStatus: typedOrder.payment_status,
            transactionStatus: transaction_status
          })
          
          emailPromise.then((result) => {
            console.log('✅ [WEBHOOK EMAIL DEBUG] Email send completed:', result)
          }).catch(error => {
            console.error('❌ [WEBHOOK EMAIL DEBUG] Email send FAILED:', error)
            console.error('❌ [WEBHOOK EMAIL DEBUG] Error details:', error.message)
            console.error('❌ [WEBHOOK EMAIL DEBUG] Error stack:', error.stack)
          })
        } else {
          console.log(`⏭️ [WEBHOOK EMAIL DEBUG] Skipping email - transaction_status "${transaction_status}" not in critical states`)
        }
      }
      
      // ✅ IMPROVEMENT 6: Only notify on critical states (avoid spam)
      const criticalStates = ['capture', 'settlement', 'refund', 'partial_refund', 'chargeback', 'reversal', 'deny', 'cancel', 'expire']
      
      if (!criticalStates.includes(transaction_status)) {
        console.log(`⏭️ [WEBHOOK] Skipping notification for non-critical status: ${transaction_status}`)
      } else {
        // Create notification for user based on payment status
        let notificationTitle = ''
        let notificationMessage = ''
        let notificationType: 'order' | 'payment' | 'promotion' | 'general' = 'order'

        switch (transaction_status) {
        case 'capture':
        case 'settlement':
          notificationTitle = 'Payment Successful! 🎉'
          notificationMessage = `Your payment for order #${order_id} has been confirmed. Your order is now being processed.`
          notificationType = 'payment'
          break

        case 'authorize':
          notificationTitle = 'Payment Authorized'
          notificationMessage = `Your payment for order #${order_id} has been authorized and will be captured soon.`
          notificationType = 'payment'
          break

        case 'challenge':
          notificationTitle = 'Payment Under Review'
          notificationMessage = `Your payment for order #${order_id} is under review for security purposes. We'll notify you once it's confirmed.`
          notificationType = 'payment'
          break

        case 'pending':
          notificationTitle = 'Payment Pending'
          notificationMessage = `Your payment for order #${order_id} is being processed. We'll notify you once it's confirmed.`
          notificationType = 'payment'
          break

        case 'refund':
          notificationTitle = 'Payment Refunded'
          notificationMessage = `Your payment for order #${order_id} has been refunded. The amount will be returned to your account within 3-7 business days.`
          notificationType = 'payment'
          break

        case 'partial_refund':
          notificationTitle = 'Partial Refund Processed'
          notificationMessage = `A partial refund has been processed for order #${order_id}. The amount will be returned to your account within 3-7 business days.`
          notificationType = 'payment'
          break

        case 'chargeback':
          notificationTitle = 'Payment Disputed'
          notificationMessage = `A chargeback has been initiated for order #${order_id}. Our team will contact you regarding this matter.`
          notificationType = 'payment'
          break

        case 'reversal':
          notificationTitle = 'Chargeback Reversed'
          notificationMessage = `The chargeback for order #${order_id} has been reversed in your favor. Your order is being processed.`
          notificationType = 'payment'
          break

        case 'expire':
          notificationTitle = 'Payment Link Expired'
          notificationMessage = `Your payment link for order #${order_id} has expired. You can create a new order to complete your purchase.`
          notificationType = 'payment'
          break

        case 'deny':
        case 'cancel':
          notificationTitle = 'Payment Failed'
          notificationMessage = `Your payment for order #${order_id} was ${transaction_status === 'deny' ? 'declined' : 'cancelled'}. Please try again or use a different payment method.`
          notificationType = 'payment'
          break
      }

        console.log('\n🔍 [WEBHOOK NOTIFICATION DEBUG] Starting notification check...')
        console.log('🔍 [WEBHOOK NOTIFICATION DEBUG] Notification Title:', notificationTitle)
        console.log('🔍 [WEBHOOK NOTIFICATION DEBUG] Notification Message:', notificationMessage)
        console.log('🔍 [WEBHOOK NOTIFICATION DEBUG] User ID:', typedOrder.user_id)
        
        if (!notificationTitle) {
          console.error('❌ [WEBHOOK NOTIFICATION DEBUG] NO NOTIFICATION TITLE - Skipping notification creation')
        } else if (!typedOrder.user_id) {
          console.error('❌ [WEBHOOK NOTIFICATION DEBUG] NO USER ID - Cannot create notification!')
        } else {
          console.log('\n✅ [WEBHOOK NOTIFICATION DEBUG] CREATING NOTIFICATION!')
          console.log('🔔 [WEBHOOK] Creating notification for payment status update...')
          console.log('🔔 [WEBHOOK] Notification data:', {
            user_id: typedOrder.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            link: `/account/orders/${typedOrder.id}`,
            read: false
          })
          
          const { data: notifData, error: notifError } = await supabase.from('notifications').insert({
            user_id: typedOrder.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            link: `/account/orders/${typedOrder.id}`,
            read: false
          } as any)
          
          if (notifError) {
            console.error('❌ [WEBHOOK NOTIFICATION DEBUG] Notification creation FAILED!')
            console.error('❌ [WEBHOOK NOTIFICATION DEBUG] Error:', notifError)
            console.error('❌ [WEBHOOK NOTIFICATION DEBUG] Error message:', notifError.message)
            console.error('❌ [WEBHOOK NOTIFICATION DEBUG] Error details:', notifError.details)
            console.error('❌ [WEBHOOK NOTIFICATION DEBUG] Error hint:', notifError.hint)
          } else {
            console.log('✅ [WEBHOOK NOTIFICATION DEBUG] Notification created successfully!')
            console.log('✅ [WEBHOOK NOTIFICATION DEBUG] Notification data:', notifData)
          }
        }
      }
    }

    console.log('=== MIDTRANS WEBHOOK PROCESSED SUCCESSFULLY ===')
    console.log('Summary:', {
      order_id,
      transaction_id,
      payment_type,
      transaction_status,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('=== MIDTRANS WEBHOOK ERROR ===')
    console.error('Error details:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
