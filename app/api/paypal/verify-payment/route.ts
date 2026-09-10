import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Verify PayPal payment status by calling PayPal API directly.
 * This is a server-side verification that the capture actually succeeded,
 * independent of client-side reports.
 *
 * GET /api/paypal/verify-payment?orderId=<order_id>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Fetch our order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, payment_status, status, paypal_order_id, payment_gateway, payment_metadata')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const paypalOrderId = (order as any).paypal_order_id

    if (!paypalOrderId) {
      return NextResponse.json({
        orderId,
        verified: false,
        message: 'No PayPal order ID associated with this order',
        dbStatus: (order as any).payment_status,
      })
    }

    // Call PayPal API to get the actual order status
    const accessToken = await getPayPalAccessToken()
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('[PAYPAL-VERIFY] PayPal API error:', response.status, errData)
      return NextResponse.json({
        orderId,
        verified: false,
        message: 'Failed to verify with PayPal',
        dbStatus: (order as any).payment_status,
        paypalError: (errData as any).message,
      }, { status: 502 })
    }

    const paypalData = await response.json()
    const paypalStatus = paypalData.status // CREATED, APPROVED, COMPLETED, etc.
    const captures = paypalData.purchase_units?.[0]?.payments?.captures?.[0]
    const captureStatus = captures?.status // COMPLETED, PENDING, DECLINED, etc.

    // Determine actual payment status from PayPal
    let actualPaymentStatus = 'pending_payment'
    let actualOrderStatus = 'pending_payment'

    if (captureStatus === 'COMPLETED') {
      actualPaymentStatus = 'paid'
      actualOrderStatus = 'processing'
    } else if (captureStatus === 'PENDING') {
      actualPaymentStatus = 'pending'
    } else if (captureStatus === 'DECLINED' || captureStatus === 'DENIED') {
      actualPaymentStatus = 'failed'
      actualOrderStatus = 'cancelled'
    } else if (paypalStatus === 'APPROVED') {
      // Approved but not yet captured
      actualPaymentStatus = 'pending'
    } else if (paypalStatus === 'COMPLETED') {
      actualPaymentStatus = 'paid'
      actualOrderStatus = 'processing'
    }

    const dbStatus = (order as any).payment_status
    const isConsistent = dbStatus === actualPaymentStatus

    // If PayPal says paid but our DB doesn't, fix it
    if (actualPaymentStatus === 'paid' && dbStatus !== 'paid') {
      console.log(`[PAYPAL-VERIFY] Syncing order ${orderId} to paid (was ${dbStatus})`)
      
      // Use atomic RPC to prevent double capture and complete reservation
      const { error: captureError } = await supabase.rpc('capture_payment_safe', {
        p_order_id: orderId,
        p_payment_metadata: {
          ...(order as any).payment_metadata,
          paypal_order_id: paypalOrderId,
          paypal_capture_id: captures?.id,
          transaction_time: new Date().toISOString(),
          verified_via: 'verify-endpoint',
        },
        p_captured_via: 'verify-endpoint',
      })

      if (captureError) {
        console.error('[PAYPAL-VERIFY] Sync failed:', captureError)
      }

      // Audit log the correction
      await supabase.from('audit_logs').insert({
        entity_type: 'payment',
        entity_id: orderId,
        action: 'paypal.verify.synced',
        changes: {
          gateway: 'paypal',
          previous_status: dbStatus,
          new_status: 'paid',
          paypal_capture_id: captures?.id,
        },
        user_id: null,
        user_email: 'verify-endpoint',
      })
    }

    // If PayPal says failed but our DB says paid, flag it
    if (actualPaymentStatus === 'failed' && dbStatus === 'paid') {
      console.error(`[PAYPAL-VERIFY] MISMATCH: DB says paid but PayPal says failed for order ${orderId}`)
      await supabase.from('audit_logs').insert({
        entity_type: 'payment',
        entity_id: orderId,
        action: 'paypal.verify.mismatch',
        changes: {
          gateway: 'paypal',
          db_status: dbStatus,
          paypal_status: actualPaymentStatus,
          paypal_capture_status: captureStatus,
        },
        user_id: null,
        user_email: 'verify-endpoint',
      })
    }

    return NextResponse.json({
      orderId,
      verified: true,
      consistent: isConsistent,
      dbStatus,
      paypalStatus,
      captureStatus,
      actualPaymentStatus,
      paypalOrderId,
      captureId: captures?.id,
      synced: !isConsistent && actualPaymentStatus === 'paid',
    })
  } catch (error: any) {
    console.error('[PAYPAL-VERIFY] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
