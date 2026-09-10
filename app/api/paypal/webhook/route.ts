import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal/config'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// PayPal-supported currencies for validation
const PAYPAL_SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'SGD', 'HKD', 'NZD',
  'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'ILS', 'MXN',
  'BRL', 'MYR', 'PHP', 'THB', 'TWD', 'TRY', 'RUB', 'INR', 'IDR'
]

async function logPaymentAudit(
  orderId: string,
  action: string,
  status: string,
  metadata?: any
) {
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'payment',
      entity_id: orderId,
      action: `paypal.${action}`,
      changes: { gateway: 'paypal', status, ...metadata },
      user_id: null,
      user_email: 'paypal-webhook',
    })
  } catch (err) {
    console.error('[PAYPAL-WEBHOOK] Failed to write audit log:', err)
  }
}

async function verifyWebhookSignature(
  webhookId: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken()

    const verifyPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    })

    if (!response.ok) {
      console.error('[PAYPAL-WEBHOOK] Signature verification API failed:', response.status)
      return false
    }

    const data = await response.json()
    return data.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('[PAYPAL-WEBHOOK] Signature verification error:', err)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || ''

    if (!webhookId) {
      console.error('[PAYPAL-WEBHOOK] PAYPAL_WEBHOOK_ID not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Collect PayPal headers
    const headers: Record<string, string> = {
      'paypal-auth-algo': request.headers.get('paypal-auth-algo') || '',
      'paypal-cert-url': request.headers.get('paypal-cert-url') || '',
      'paypal-transmission-id': request.headers.get('paypal-transmission-id') || '',
      'paypal-transmission-sig': request.headers.get('paypal-transmission-sig') || '',
      'paypal-transmission-time': request.headers.get('paypal-transmission-time') || '',
    }

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(webhookId, headers, body)
    if (!isValid) {
      console.error('[PAYPAL-WEBHOOK] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const eventType = event.event_type

    console.log(`[PAYPAL-WEBHOOK] Received event: ${eventType}`)

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED': {
        // Buyer approved the order — auto-capture it
        const paypalOrderId = event.resource.id
        const resource = event.resource

        // Find our order by paypal_order_id
        const { data: order } = await supabase
          .from('orders')
          .select('id, payment_status, status, user_id')
          .eq('paypal_order_id', paypalOrderId)
          .single()

        if (!order) {
          console.error(`[PAYPAL-WEBHOOK] Order not found for PayPal order: ${paypalOrderId}`)
          return NextResponse.json({ received: true })
        }

        // Only capture if not already paid
        if (order.payment_status === 'paid') {
          console.log(`[PAYPAL-WEBHOOK] Order ${order.id} already paid, skipping`)
          return NextResponse.json({ received: true })
        }

        await logPaymentAudit(order.id, 'order.approved', order.payment_status, {
          paypal_order_id: paypalOrderId,
        })

        // Auto-capture the payment
        const accessToken = await getPayPalAccessToken()
        const captureResponse = await fetch(
          `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'PayPal-Request-Id': `capture-${order.id}-${Date.now()}`,
            },
          }
        )

        const captureData = await captureResponse.json()
        const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0]
        const captureStatus = capture?.status

        if (captureStatus === 'COMPLETED') {
          // Use atomic RPC to prevent double capture and complete reservation
          const { error: captureError } = await supabase.rpc('capture_payment_safe', {
            p_order_id: order.id,
            p_payment_metadata: {
              paypal_order_id: paypalOrderId,
              paypal_capture_id: capture.id,
              transaction_time: new Date().toISOString(),
              captured_via: 'webhook',
            },
            p_captured_via: 'webhook',
          })

          if (captureError) {
            console.error(`[PAYPAL-WEBHOOK] Atomic capture failed for order ${order.id}:`, captureError)
          } else {
            console.log(`[PAYPAL-WEBHOOK] Order ${order.id} captured and marked paid`)
          }

          await logPaymentAudit(order.id, 'capture.completed', 'paid', {
            paypal_capture_id: capture.id,
            captured_via: 'webhook',
          })
        } else if (captureStatus === 'PENDING') {
          await supabase
            .from('orders')
            .update({
              payment_status: 'pending',
              payment_metadata: { paypal_order_id: paypalOrderId, captured_via: 'webhook' },
            })
            .eq('id', order.id)

          await logPaymentAudit(order.id, 'capture.pending', 'pending', {
            paypal_capture_id: capture?.id,
          })
          console.log(`[PAYPAL-WEBHOOK] Order ${order.id} capture pending`)
        } else {
          await logPaymentAudit(order.id, 'capture.failed', captureStatus || 'unknown', {
            capture_data: captureData,
          })
          console.error(`[PAYPAL-WEBHOOK] Order ${order.id} capture failed: ${captureStatus}`)
        }
        break
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const capture = event.resource
        const paypalOrderId = capture.supplementary_data?.related_ids?.order_id

        if (!paypalOrderId) {
          console.error('[PAYPAL-WEBHOOK] No order ID in capture event')
          return NextResponse.json({ received: true })
        }

        const { data: order } = await supabase
          .from('orders')
          .select('id, payment_status, user_id')
          .eq('paypal_order_id', paypalOrderId)
          .single()

        if (!order) {
          console.error(`[PAYPAL-WEBHOOK] Order not found for PayPal order: ${paypalOrderId}`)
          return NextResponse.json({ received: true })
        }

        if (order.payment_status === 'paid') {
          console.log(`[PAYPAL-WEBHOOK] Order ${order.id} already paid`)
          return NextResponse.json({ received: true })
        }

        // Use atomic RPC to prevent double capture and complete reservation
        const { error: captureError } = await supabase.rpc('capture_payment_safe', {
          p_order_id: order.id,
          p_payment_metadata: {
            paypal_order_id: paypalOrderId,
            paypal_capture_id: capture.id,
            transaction_time: new Date().toISOString(),
            captured_via: 'webhook',
          },
          p_captured_via: 'webhook',
        })

        if (captureError) {
          console.error(`[PAYPAL-WEBHOOK] Atomic capture failed for order ${order.id}:`, captureError)
        }

        await logPaymentAudit(order.id, 'capture.completed', 'paid', {
          paypal_capture_id: capture.id,
          captured_via: 'webhook',
        })
        console.log(`[PAYPAL-WEBHOOK] Order ${order.id} marked paid via capture event`)
        break
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        const capture = event.resource
        const paypalOrderId = capture.supplementary_data?.related_ids?.order_id

        if (!paypalOrderId) {
          return NextResponse.json({ received: true })
        }

        const { data: order } = await supabase
          .from('orders')
          .select('id, payment_status')
          .eq('paypal_order_id', paypalOrderId)
          .single()

        if (!order) {
          return NextResponse.json({ received: true })
        }

        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
            payment_metadata: {
              paypal_order_id: paypalOrderId,
              failure_reason: capture.status_details?.reason || 'denied',
              failed_via: 'webhook',
            },
          })
          .eq('id', order.id)

        await logPaymentAudit(order.id, 'capture.denied', 'failed', {
          reason: capture.status_details?.reason || 'denied',
        })
        console.log(`[PAYPAL-WEBHOOK] Order ${order.id} marked failed via capture denied`)
        break
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const capture = event.resource
        const paypalOrderId = capture.supplementary_data?.related_ids?.order_id

        if (!paypalOrderId) {
          return NextResponse.json({ received: true })
        }

        const { data: order } = await supabase
          .from('orders')
          .select('id, payment_status')
          .eq('paypal_order_id', paypalOrderId)
          .single()

        if (!order) {
          return NextResponse.json({ received: true })
        }

        await supabase
          .from('orders')
          .update({
            payment_status: 'refunded',
            status: 'refunded',
            payment_metadata: {
              paypal_order_id: paypalOrderId,
              refund_id: capture.id,
              refund_amount: capture.amount?.value,
              refund_currency: capture.amount?.currency_code,
              refunded_via: 'webhook',
            },
          })
          .eq('id', order.id)

        await logPaymentAudit(order.id, 'capture.refunded', 'refunded', {
          refund_id: capture.id,
          refund_amount: capture.amount?.value,
        })
        console.log(`[PAYPAL-WEBHOOK] Order ${order.id} marked refunded`)
        break
      }

      default:
        console.log(`[PAYPAL-WEBHOOK] Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[PAYPAL-WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
