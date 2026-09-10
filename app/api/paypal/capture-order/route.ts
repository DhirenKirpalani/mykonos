import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal/config'
import { rateLimit } from '@/lib/paypal/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function logPaymentAudit(orderId: string, action: string, status: string, metadata?: any) {
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: orderId,
      action: `paypal.${action}`,
      changes: { gateway: 'paypal', status, ...metadata },
      user_id: null,
      user_email: 'paypal-api',
    })
  } catch (err) {
    console.error('[PAYPAL-CAPTURE] Failed to write audit log:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 capture-order requests per minute per IP
    const limited = rateLimit(request, 10, 60_000)
    if (limited) return limited

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { paypalOrderId, orderId } = body

    if (!paypalOrderId || !orderId) {
      return NextResponse.json({ error: 'Missing paypalOrderId or orderId' }, { status: 400 })
    }

    // Check if order is already paid (idempotency guard)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .single()

    if (existingOrder?.payment_status === 'paid') {
      return NextResponse.json({ success: true, status: 'paid', orderId, message: 'Already paid' })
    }

    const accessToken = await getPayPalAccessToken()

    // Use idempotency key to prevent duplicate captures
    const requestId = `capture-${orderId}`

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[PAYPAL-CAPTURE] PayPal API error:', data.message || response.status)
      await logPaymentAudit(orderId, 'capture.failed', 'failed', {
        paypal_order_id: paypalOrderId,
        error: data.message,
      })
      return NextResponse.json({ error: data.message || 'Failed to capture PayPal payment' }, { status: 500 })
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0]
    const paymentStatus = capture?.status

    if (paymentStatus === 'COMPLETED') {
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .single()

      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
          paid_at: new Date().toISOString(),
          payment_metadata: {
            paypal_order_id: paypalOrderId,
            paypal_capture_id: capture.id,
            transaction_time: new Date().toISOString(),
            captured_via: 'client',
          },
        })
        .eq('id', orderId)

      // Clear cart for authenticated users
      if (order?.user_id) {
        await supabase.from('cart_items').delete().eq('user_id', order.user_id)
      }

      await logPaymentAudit(orderId, 'capture.completed', 'paid', {
        paypal_order_id: paypalOrderId,
        paypal_capture_id: capture.id,
        captured_via: 'client',
      })

      return NextResponse.json({ success: true, status: 'paid', orderId })
    } else if (paymentStatus === 'PENDING') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'pending',
          payment_metadata: { paypal_order_id: paypalOrderId },
        })
        .eq('id', orderId)

      await logPaymentAudit(orderId, 'capture.pending', 'pending', {
        paypal_order_id: paypalOrderId,
      })

      return NextResponse.json({ success: true, status: 'pending', orderId })
    } else {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
        })
        .eq('id', orderId)

      await logPaymentAudit(orderId, 'capture.failed', 'failed', {
        paypal_order_id: paypalOrderId,
        capture_status: paymentStatus,
      })

      return NextResponse.json({ success: false, status: 'failed', orderId }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[PAYPAL-CAPTURE] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to capture PayPal payment' }, { status: 500 })
  }
}
