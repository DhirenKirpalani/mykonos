import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal/config'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Retry capturing PayPal orders that were approved but not captured.
 * This can be called:
 *   - Manually: POST /api/paypal/retry-capture with { orderId }
 *   - As a cron: POST /api/paypal/retry-capture (processes all eligible orders)
 *
 * Eligible orders: payment_gateway='paypal', payment_status='pending_payment',
 *   paypal_order_id IS NOT NULL, expiry_time > now
 */
export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET — this endpoint is called by Vercel cron and admins
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { orderId } = body

    // If a specific orderId is provided, retry just that one
    if (orderId) {
      return await retryOrder(orderId)
    }

    // Otherwise, find all eligible orders for bulk retry
    const { data: eligibleOrders, error } = await supabase
      .from('orders')
      .select('id, paypal_order_id, expiry_time')
      .eq('payment_gateway', 'paypal')
      .eq('payment_status', 'pending_payment')
      .not('paypal_order_id', 'is', null)
      .gt('expiry_time', new Date().toISOString())
      .limit(50)

    if (error) {
      console.error('[PAYPAL-RETRY] Failed to fetch eligible orders:', error.message)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    if (!eligibleOrders || eligibleOrders.length === 0) {
      return NextResponse.json({ message: 'No eligible orders for retry', processed: 0 })
    }

    let succeeded = 0
    let failed = 0
    let stillPending = 0
    const results: any[] = []

    for (const order of eligibleOrders) {
      try {
        const result = await retryOrderInternal(order.id, order.paypal_order_id)
        results.push({ orderId: order.id, ...result })
        if (result.status === 'paid') succeeded++
        else if (result.status === 'failed') failed++
        else stillPending++
      } catch (err: any) {
        failed++
        results.push({ orderId: order.id, status: 'error', error: err.message })
      }
    }

    return NextResponse.json({
      processed: eligibleOrders.length,
      succeeded,
      failed,
      stillPending,
      results,
    })
  } catch (error: any) {
    console.error('[PAYPAL-RETRY] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Retry failed' }, { status: 500 })
  }
}

async function retryOrder(orderId: string) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, paypal_order_id, payment_status, expiry_time')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const paypalOrderId = (order as any).paypal_order_id
  if (!paypalOrderId) {
    return NextResponse.json({ error: 'No PayPal order ID' }, { status: 400 })
  }

  if ((order as any).payment_status === 'paid') {
    return NextResponse.json({ success: true, status: 'paid', message: 'Already paid' })
  }

  const result = await retryOrderInternal(orderId, paypalOrderId)
  return NextResponse.json({ orderId, ...result })
}

async function retryOrderInternal(orderId: string, paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken()

  // First check the PayPal order status
  const statusResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })

  if (!statusResponse.ok) {
    const errData = await statusResponse.json().catch(() => ({}))
    console.error(`[PAYPAL-RETRY] Failed to check order ${orderId}:`, (errData as any).message)
    return { status: 'error', error: 'Failed to check PayPal order status' }
  }

  const paypalData = await statusResponse.json()
  const paypalStatus = paypalData.status

  // If not approved yet, nothing to capture
  if (paypalStatus !== 'APPROVED' && paypalStatus !== 'COMPLETED') {
    return { status: 'pending', paypalStatus, message: 'Order not yet approved by buyer' }
  }

  // If already completed, check if captured
  if (paypalStatus === 'COMPLETED') {
    const capture = paypalData.purchase_units?.[0]?.payments?.captures?.[0]
    if (capture?.status === 'COMPLETED') {
      // Already captured — sync our DB with atomic RPC
      const { error: captureError } = await supabase.rpc('capture_payment_safe', {
        p_order_id: orderId,
        p_payment_metadata: {
          paypal_order_id: paypalOrderId,
          paypal_capture_id: capture.id,
          transaction_time: new Date().toISOString(),
          captured_via: 'retry',
        },
        p_captured_via: 'retry',
      })

      if (captureError) {
        console.error('[RETRY-CAPTURE] Sync failed:', captureError)
      }

      await supabase.from('audit_logs').insert({
        entity_type: 'payment',
        entity_id: orderId,
        action: 'paypal.retry.synced',
        changes: { gateway: 'paypal', status: 'paid', captured_via: 'retry' },
        user_id: null,
        user_email: 'retry-capture',
      })

      return { status: 'paid', captureId: capture.id, message: 'Synced from PayPal (already captured)' }
    }
  }

  // Attempt capture with idempotency key
  const requestId = `capture-${orderId}`
  const captureResponse = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
      },
    }
  )

  const captureData = await captureResponse.json()
  const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0]
  const captureStatus = capture?.status

  if (captureStatus === 'COMPLETED') {
    // Use atomic RPC to prevent double capture and complete reservation
    const { error: captureError } = await supabase.rpc('capture_payment_safe', {
      p_order_id: orderId,
      p_payment_metadata: {
        paypal_order_id: paypalOrderId,
        paypal_capture_id: capture.id,
        transaction_time: new Date().toISOString(),
        captured_via: 'retry',
      },
      p_captured_via: 'retry',
    })

    if (captureError) {
      console.error('[RETRY-CAPTURE] Capture failed:', captureError)
    }

    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: orderId,
      action: 'paypal.retry.captured',
      changes: { gateway: 'paypal', status: 'paid', captured_via: 'retry' },
      user_id: null,
      user_email: 'retry-capture',
    })

    return { status: 'paid', captureId: capture.id }
  } else if (captureStatus === 'PENDING') {
    await supabase
      .from('orders')
      .update({ payment_status: 'pending' })
      .eq('id', orderId)

    return { status: 'pending', captureStatus }
  } else {
    await supabase
      .from('orders')
      .update({ payment_status: 'failed', status: 'cancelled' })
      .eq('id', orderId)

    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: orderId,
      action: 'paypal.retry.failed',
      changes: { gateway: 'paypal', status: 'failed', capture_status: captureStatus },
      user_id: null,
      user_email: 'retry-capture',
    })

    return { status: 'failed', captureStatus }
  }
}
