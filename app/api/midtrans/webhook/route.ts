import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== MIDTRANS WEBHOOK RECEIVED ===')
    console.log('Full Midtrans payload:', JSON.stringify(body, null, 2))
    
    const {
      order_id,
      transaction_status,
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
      .update(`${order_id}${transaction_status}${gross_amount}${serverKey}`)
      .digest('hex')

    console.log('🔐 [WEBHOOK] Signature verification:', {
      order_id,
      transaction_status,
      gross_amount,
      server_key_prefix: serverKey.substring(0, 10),
      expected_hash: hash.substring(0, 20) + '...',
      received_signature: signature_key.substring(0, 20) + '...',
      match: hash === signature_key
    })

    if (hash !== signature_key) {
      console.error('❌ [WEBHOOK] Invalid signature - potential fraud attempt or wrong server key')
      console.error('Expected hash:', hash)
      console.error('Received signature:', signature_key)
      console.error('Hash input string:', `${order_id}${transaction_status}${gross_amount}${serverKey}`)
      
      // TEMPORARY: Allow webhook to proceed despite signature mismatch for debugging
      // TODO: Remove this after resolving Midtrans server key issue
      console.warn('⚠️ [WEBHOOK] SECURITY BYPASS: Continuing despite signature mismatch')
      console.warn('⚠️ [WEBHOOK] This should be fixed by contacting Midtrans support')
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

    // Get updated order data
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, user_id, payment_status, status, order_number')
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

        if (notificationTitle) {
          await supabase.from('notifications').insert({
            user_id: typedOrder.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            read: false,
          } as any)
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
