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

    // Skip signature verification for testing
    // TODO: Re-enable this in production with proper signature validation
    /*
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    const hash = crypto
      .createHash('sha512')
      .update(`${order_id}${transaction_status}${gross_amount}${serverKey}`)
      .digest('hex')

    if (hash !== signature_key) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      )
    }
    */

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    console.log('Supabase config:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl?.substring(0, 20)
    })
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    console.log('Updating order:', order_id, 'to status:', orderStatus)
    
    // Extract last 4 digits from masked card if available
    const cardLast4 = masked_card ? masked_card.slice(-4) : null
    
    const updateData: any = {
      payment_status: paymentStatus,
      status: orderStatus,
      payment_intent_id: transaction_id,
      payment_method: payment_type,
      midtrans_order_id: order_id,
      midtrans_transaction_id: transaction_id,
      payment_method_type: payment_type,
      payment_channel: bank || acquirer,
      card_type: card_type,
      card_last4: cardLast4,
      payment_metadata: body, // Store full Midtrans response
    }
    
    console.log('Order update data:', JSON.stringify(updateData, null, 2))
    
    const { error: updateError } = await (supabase
      .from('orders')
      .update as any)(updateData)
      .eq('order_number', order_id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }
    
    console.log('Order updated successfully')

    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, payment_method_type, payment_channel, card_type, card_last4')
      .eq('order_number', order_id)
      .single()
    
    console.log('Updated order data:', order)

    if (order) {
      // Add order status history
      await supabase.from('order_status_history').insert({
        order_id: (order as any).id,
        status: orderStatus,
        notes: `Payment ${transaction_status} via ${payment_type}. Transaction ID: ${transaction_id}`,
      } as any)

      // Create notification for user based on payment status
      let notificationTitle = ''
      let notificationMessage = ''
      let notificationType: 'order' | 'payment' | 'promotion' | 'general' = 'order'

      if (paymentStatus === 'completed') {
        notificationTitle = 'Payment Successful! 🎉'
        notificationMessage = `Your payment for order #${order_id} has been confirmed. Your order is now being processed.`
        notificationType = 'payment'
      } else if (paymentStatus === 'failed') {
        notificationTitle = 'Payment Failed'
        notificationMessage = `Unfortunately, your payment for order #${order_id} could not be processed. Please try again or contact support.`
        notificationType = 'payment'
      } else if (paymentStatus === 'pending' && transaction_status === 'pending') {
        notificationTitle = 'Payment Pending'
        notificationMessage = `Your payment for order #${order_id} is being processed. We'll notify you once it's confirmed.`
        notificationType = 'payment'
      }

      if (notificationTitle) {
        await supabase.from('notifications').insert({
          user_id: (order as any).user_id,
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
      status: orderStatus,
      payment_status: paymentStatus,
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
