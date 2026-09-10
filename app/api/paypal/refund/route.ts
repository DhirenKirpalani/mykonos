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
 * Refund a PayPal payment (admin only).
 *
 * POST /api/paypal/refund
 * Body: { orderId, amount?, note? }
 *   - orderId: internal order ID
 *   - amount: (optional) partial refund amount. If omitted, full refund.
 *   - note: (optional) refund note
 *
 * Requires admin authentication.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || (userData as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { orderId, amount, note } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, paypal_order_id, payment_status, payment_metadata, total_amount, currency_code')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const paypalOrderId = (order as any).paypal_order_id
    const paymentMetadata = (order as any).payment_metadata as any
    const captureId = paymentMetadata?.paypal_capture_id

    if (!captureId) {
      return NextResponse.json({ error: 'No PayPal capture ID found for this order' }, { status: 400 })
    }

    if ((order as any).payment_status !== 'paid' && (order as any).payment_status !== 'refunded') {
      return NextResponse.json({ error: 'Order is not in a refundable state' }, { status: 400 })
    }

    // Call PayPal refund API
    const accessToken = await getPayPalAccessToken()
    const refundPayload: any = {}

    if (amount !== undefined && amount > 0) {
      const currency = (order as any).currency_code || paymentMetadata?.currency_code || 'USD'
      refundPayload.amount = {
        currency_code: currency.toUpperCase(),
        value: amount.toFixed(2),
      }
    }

    if (note) {
      refundPayload.note_to_payer = note
    }

    // Use idempotency key
    const requestId = `refund-${orderId}`

    const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
      },
      body: JSON.stringify(refundPayload),
    })

    const refundData = await response.json()

    if (!response.ok) {
      console.error('[PAYPAL-REFUND] PayPal API error:', refundData.message || response.status)
      await supabase.from('audit_logs').insert({
        entity_type: 'payment',
        entity_id: orderId,
        action: 'paypal.refund.failed',
        changes: {
          gateway: 'paypal',
          capture_id: captureId,
          error: refundData.message,
          admin_id: user.id,
        },
        user_id: user.id,
        user_email: user.email,
      })
      return NextResponse.json(
        { error: refundData.message || 'Failed to refund PayPal payment' },
        { status: 500 }
      )
    }

    const refundStatus = refundData.status // COMPLETED, PENDING
    const refundId = refundData.id
    const refundAmount = refundData.amount?.value
    const refundCurrency = refundData.amount?.currency_code

    // Determine if this is a full or partial refund
    const isFullRefund = amount === undefined || amount >= (order as any).total_amount
    const newPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded'
    const newOrderStatus = isFullRefund ? 'refunded' : (order as any).status

    // Update order
    await supabase
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        payment_metadata: {
          ...paymentMetadata,
          refund_id: refundId,
          refund_amount: refundAmount,
          refund_currency: refundCurrency,
          refund_status: refundStatus,
          refund_note: note,
          refunded_by: user.id,
          refunded_at: new Date().toISOString(),
        },
      })
      .eq('id', orderId)

    // Audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: orderId,
      action: 'paypal.refund.completed',
      changes: {
        gateway: 'paypal',
        capture_id: captureId,
        refund_id: refundId,
        refund_amount: refundAmount,
        refund_currency: refundCurrency,
        refund_type: isFullRefund ? 'full' : 'partial',
        refund_status: refundStatus,
        admin_id: user.id,
      },
      user_id: user.id,
      user_email: user.email,
    })

    return NextResponse.json({
      success: true,
      refundId,
      refundStatus,
      refundAmount,
      refundCurrency,
      paymentStatus: newPaymentStatus,
      orderStatus: newOrderStatus,
    })
  } catch (error: any) {
    console.error('[PAYPAL-REFUND] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Refund failed' },
      { status: 500 }
    )
  }
}
