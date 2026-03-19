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
    })

    // ✅ Payment Verification - Verify signature to prevent fraud
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    if (serverKey) {
      const hash = crypto
        .createHash('sha512')
        .update(`${order_id}${transaction_status}${gross_amount}${serverKey}`)
        .digest('hex')

      if (hash !== signature_key) {
        console.error('❌ Invalid signature - potential fraud attempt')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        )
      }
      console.log('✅ Signature verified')
    } else {
      console.warn('⚠️ MIDTRANS_SERVER_KEY not set - skipping signature verification (UNSAFE)')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    console.log('Supabase config:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl?.substring(0, 20)
    })
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Processing payment status for order:', order_id)
    
    // Get the order ID from order_number
    const { data: orderData } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', order_id)
      .single()
    
    if (!orderData) {
      console.error('Order not found:', order_id)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    const orderId = (orderData as any).id
    console.log('Found order ID:', orderId)
    
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
    console.log('Calling complete_order_payment with status:', transaction_status)
    const { error: completeError } = await supabase.rpc('complete_order_payment', {
      p_order_id: orderId,
      p_payment_intent_id: transaction_id,
      p_transaction_status: transaction_status,
      p_gross_amount: parseFloat(gross_amount),
      p_currency: currency
    } as any)
    
    if (completeError) {
      console.error('Failed to complete order payment:', completeError)
      return NextResponse.json(
        { error: 'Failed to complete order payment' },
        { status: 500 }
      )
    }
    
    console.log('Order payment completed successfully')
    
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
    
    await supabase
      .from('orders')
      .update(metadataUpdate)
      .eq('id', orderId)

    // Get updated order data
    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, payment_status, status')
      .eq('id', orderId)
      .single()
    
    console.log('Updated order data:', order)

    if (order) {
      const typedOrder = order as any
      
      // Create notification for user based on payment status
      let notificationTitle = ''
      let notificationMessage = ''
      let notificationType: 'order' | 'payment' | 'promotion' | 'general' = 'order'

      if (transaction_status === 'capture' || transaction_status === 'settlement') {
        notificationTitle = 'Payment Successful! 🎉'
        notificationMessage = `Your payment for order #${order_id} has been confirmed. Your order is now being processed.`
        notificationType = 'payment'
      } else if (transaction_status === 'expire') {
        notificationTitle = 'Payment Link Expired'
        notificationMessage = `Your payment link for order #${order_id} has expired. You can create a new order to complete your purchase.`
        notificationType = 'payment'
      } else if (transaction_status === 'pending') {
        notificationTitle = 'Payment Pending'
        notificationMessage = `Your payment for order #${order_id} is being processed. We'll notify you once it's confirmed.`
        notificationType = 'payment'
      }
      // Note: For 'cancel' and 'deny', we keep order as pending for retry, so no notification

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
