import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const { paypalOrderId, orderId } = await request.json()

    console.log('🔵 [PAYPAL-CAPTURE] POST /api/paypal/capture-order')
    console.log('🔵 [PAYPAL-CAPTURE] Request:', { paypalOrderId, orderId })

    if (!paypalOrderId || !orderId) {
      console.error('❌ [PAYPAL-CAPTURE] Missing paypalOrderId or orderId')
      return NextResponse.json({ error: 'Missing paypalOrderId or orderId' }, { status: 400 })
    }

    console.log('🔵 [PAYPAL-CAPTURE] Getting PayPal access token...')
    const accessToken = await getPayPalAccessToken()
    console.log('✅ [PAYPAL-CAPTURE] Access token obtained')

    // Capture the payment
    console.log('📡 [PAYPAL-CAPTURE] Calling PayPal capture API for order:', paypalOrderId)
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('📡 [PAYPAL-CAPTURE] PayPal API response status:', response.status)
    const data = await response.json()
    console.log('📡 [PAYPAL-CAPTURE] PayPal API response:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error('❌ [PAYPAL-CAPTURE] PayPal API error:', data)
      return NextResponse.json({ error: data.message || 'Failed to capture PayPal payment' }, { status: 500 })
    }

    // Check if capture was successful
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0]
    const paymentStatus = capture?.status
    console.log('🔵 [PAYPAL-CAPTURE] Capture status:', paymentStatus)
    console.log('🔵 [PAYPAL-CAPTURE] Capture ID:', capture?.id)

    if (paymentStatus === 'COMPLETED') {
      console.log('✅ [PAYPAL-CAPTURE] Payment COMPLETED, updating order...')
      // Update order to paid
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .single()

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
          paid_at: new Date().toISOString(),
          payment_metadata: {
            paypal_order_id: paypalOrderId,
            paypal_capture_id: capture.id,
            transaction_time: new Date().toISOString(),
          },
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('❌ [PAYPAL-CAPTURE] Failed to update order:', updateError)
      } else {
        console.log('✅ [PAYPAL-CAPTURE] Order updated to paid')
      }

      // Clear cart for authenticated users
      if (order?.user_id) {
        console.log('🗑️ [PAYPAL-CAPTURE] Clearing cart for user:', order.user_id)
        await supabase.from('cart_items').delete().eq('user_id', order.user_id)
      }

      return NextResponse.json({ success: true, status: 'paid', orderId })
    } else if (paymentStatus === 'PENDING') {
      console.log('⏳ [PAYPAL-CAPTURE] Payment PENDING')
      await supabase
        .from('orders')
        .update({
          payment_status: 'pending',
          payment_metadata: { paypal_order_id: paypalOrderId },
        })
        .eq('id', orderId)

      return NextResponse.json({ success: true, status: 'pending', orderId })
    } else {
      console.error('❌ [PAYPAL-CAPTURE] Payment FAILED, status:', paymentStatus)
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
        })
        .eq('id', orderId)

      return NextResponse.json({ success: false, status: 'failed', orderId }, { status: 400 })
    }
  } catch (error: any) {
    console.error('❌ [PAYPAL-CAPTURE] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to capture PayPal payment' }, { status: 500 })
  }
}
