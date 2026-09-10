import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'
import { sendOrderShippedEmail } from '@/lib/email/order-emails'
import {
  sendOutForDeliveryEmail,
  sendDeliveryAttemptedEmail,
  sendShipmentDelayedEmail,
  sendDeliveryExceptionEmail,
  sendPackageReturnedEmail
} from '@/lib/email/delivery-status-emails'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Verify the DHL webhook signature using HMAC-SHA256.
 *
 * DHL sends the raw request body and a signature header. We recompute the
 * HMAC over the raw body using the shared secret and compare in constant time.
 *
 * Supported header names:
 *  - x-dhl-signature        (commonly used by DHL)
 *  - x-dhl-hmac-signature   (alternate)
 *
 * If DHL_WEBHOOK_SECRET is not configured, verification is skipped with a
 * loud warning so it is obvious during development. In production this
 * MUST be set.
 */
function verifyDHLSignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.DHL_WEBHOOK_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[DHL Webhook] DHL_WEBHOOK_SECRET is not set — rejecting webhook in production')
      return false
    }
    console.warn('[DHL Webhook] DHL_WEBHOOK_SECRET not set — skipping verification (non-production)')
    return true
  }

  const signature = headers.get('x-dhl-signature') || headers.get('x-dhl-hmac-signature')
  if (!signature) {
    console.error('[DHL Webhook] Missing signature header')
    return false
  }

  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    const received = signature.trim()

    // DHL may send the signature as hex or base64; try hex first, then base64
    const expectedBuf = Buffer.from(expected, 'hex')
    let receivedBuf = Buffer.from(received, 'hex')

    // If hex decoding produces empty/garbage, try base64
    if (receivedBuf.length === 0 || receivedBuf.length !== expectedBuf.length) {
      receivedBuf = Buffer.from(received, 'base64')
    }

    if (receivedBuf.length !== expectedBuf.length) {
      console.error('[DHL Webhook] Signature length mismatch')
      return false
    }

    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch (err) {
    console.error('[DHL Webhook] Signature verification error:', err)
    return false
  }
}

/**
 * DHL Webhook Handler
 * Receives delivery status updates from DHL
 *
 * Events:
 * - shipment-picked-up: Package picked up by DHL
 * - shipment-in-transit: Package in transit
 * - shipment-out-for-delivery: Out for delivery
 * - shipment-delivered: Successfully delivered
 * - shipment-exception: Delivery exception/problem
 * - shipment-returned: Returned to sender
 */
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7)
  const isProduction = process.env.NODE_ENV === 'production'

  try {
    if (!isProduction) {
      console.log(`[DHL Webhook] Received [${requestId}]`)
    }

    // Read the raw body first for signature verification
    const rawBody = await request.text()

    // Verify DHL webhook signature
    if (!verifyDHLSignature(rawBody, request.headers)) {
      console.error(`[DHL Webhook] Signature verification failed [${requestId}]`)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody)
    if (!isProduction) {
      console.log('[DHL Webhook] Payload:', JSON.stringify(payload, null, 2))
    }
    
    // Extract event data
    const event = payload.event || payload.eventType
    const trackingNumber = payload.trackingNumber || payload.shipmentTrackingNumber
    const timestamp = payload.timestamp || new Date().toISOString()

    if (!isProduction) {
      console.log(`[DHL Webhook] Event: ${event}, Tracking: ${trackingNumber}, Time: ${timestamp}`)
    }

    if (!trackingNumber) {
      console.error(`[DHL Webhook] No tracking number in payload [${requestId}]`)
      return NextResponse.json({ error: 'Missing tracking number' }, { status: 400 })
    }

    // Find order by tracking number
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .or(`tracking_number.eq.${trackingNumber},dhl_shipment_number.eq.${trackingNumber}`)
      .single()

    if (orderError || !order) {
      console.error(`[DHL Webhook] Order not found for tracking number: ${trackingNumber}`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!isProduction) {
      console.log(`[DHL Webhook] Order found: ${order.order_number}`)
    }

    // Process event based on type
    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    let shouldSendEmail = false
    let emailType: 'shipped' | 'delivered' | 'out-for-delivery' | 'delivery-attempted' | 'delayed' | 'exception' | 'returned' = 'shipped'

    switch (event) {
      case 'shipment-picked-up':
      case 'PICKUP':
        updateData.status = 'shipped'
        if (!order.shipped_at) {
          updateData.shipped_at = timestamp
          shouldSendEmail = true
          emailType = 'shipped'
        }
        break

      case 'shipment-in-transit':
      case 'TRANSIT':
        updateData.status = 'shipped'
        break

      case 'shipment-out-for-delivery':
      case 'OUT_FOR_DELIVERY':
        updateData.status = 'shipped'
        shouldSendEmail = true
        emailType = 'out-for-delivery'
        break

      case 'shipment-delivered':
      case 'DELIVERED':
        updateData.status = 'delivered'
        updateData.delivered_at = timestamp
        shouldSendEmail = true
        emailType = 'delivered'
        break

      case 'shipment-exception':
      case 'EXCEPTION':
        updateData.internal_notes = `Delivery exception: ${payload.description || 'Unknown issue'}`
        shouldSendEmail = true
        emailType = 'exception'
        break

      case 'delivery-attempted':
      case 'DELIVERY_ATTEMPTED':
        updateData.internal_notes = `Delivery attempted: ${payload.description || 'No one available to receive'}`
        shouldSendEmail = true
        emailType = 'delivery-attempted'
        break

      case 'shipment-delayed':
      case 'DELAYED':
        updateData.internal_notes = `Shipment delayed: ${payload.description || 'Unknown reason'}`
        shouldSendEmail = true
        emailType = 'delayed'
        break

      case 'shipment-returned':
      case 'RETURNED':
        updateData.status = 'cancelled'
        updateData.internal_notes = `Package returned: ${payload.description || 'Unknown reason'}`
        shouldSendEmail = true
        emailType = 'returned'
        break

      default:
        if (!isProduction) {
          console.log(`[DHL Webhook] Unknown event type: ${event}`)
        }
    }

    // Update order in database
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)

    if (updateError) {
      console.error(`[DHL Webhook] Failed to update order:`, updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // Send email notification if needed
    if (shouldSendEmail && order.customer_email) {
      try {
        let customerName = order.shipping_address?.name
          || order.shipping_address?.full_name
          || (order.customer_first_name && order.customer_last_name
              ? `${order.customer_first_name} ${order.customer_last_name}`
              : null)

        // If still no name, try to get from user profile
        if (!customerName && order.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id)
          if (authUser?.user?.user_metadata) {
            const meta = authUser.user.user_metadata
            customerName = meta.full_name
              || (meta.first_name && meta.last_name ? `${meta.first_name} ${meta.last_name}` : null)
              || meta.name
          }
        }

        // Final fallback to email username
        if (!customerName) {
          customerName = order.customer_email.split('@')[0]
        }
        
        const emailData = {
          orderId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customer_email,
          customerName: customerName,
          trackingNumber: trackingNumber,
          timestamp: timestamp,
          description: payload.description,
          location: payload.location,
          estimatedDelivery: payload.estimatedDelivery,
          attemptNumber: payload.attemptNumber,
          reason: payload.reason
        }
        
        switch (emailType) {
          case 'delivered':
            await sendDeliveryConfirmationEmail({
              orderId: order.id,
              orderNumber: order.order_number,
              customerEmail: order.customer_email,
              customerName: customerName,
              trackingNumber: trackingNumber,
              deliveredAt: timestamp
            })
            break
            
          case 'shipped':
            if (!order.shipped_at) {
              await sendOrderShippedEmail({
                orderId: order.id,
                orderNumber: order.order_number,
                customerEmail: order.customer_email,
                customerName: customerName,
                trackingNumber: trackingNumber,
                trackingUrl: order.tracking_url || `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}&brand=DHL`
              })
            }
            break
            
          case 'out-for-delivery':
            await sendOutForDeliveryEmail(emailData)
            break
            
          case 'delivery-attempted':
            await sendDeliveryAttemptedEmail(emailData)
            break
            
          case 'delayed':
            await sendShipmentDelayedEmail(emailData)
            break
            
          case 'exception':
            await sendDeliveryExceptionEmail(emailData)
            break
            
          case 'returned':
            await sendPackageReturnedEmail(emailData)
            break
        }
        
        if (!isProduction) {
          console.log(`[DHL Webhook] Email sent for ${order.order_number}`)
        }
      } catch (emailError: any) {
        console.error(`[DHL Webhook] Failed to send email: ${emailError.message}`)
        // Don't fail the webhook if email fails
      }
    }

    if (!isProduction) {
      console.log(`[DHL Webhook] Processed successfully [${requestId}]`)
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      orderNumber: order.order_number,
      event
    })

  } catch (error: any) {
    console.error(`[DHL Webhook] Processing failed [${requestId}]:`, error.message)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process webhook'
      },
      { status: 500 }
    )
  }
}

/**
 * Send delivery confirmation email
 */
async function sendDeliveryConfirmationEmail(data: {
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string
  trackingNumber: string
  deliveredAt: string
}) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Get user's preferred language
  const { data: order } = await supabase
    .from('orders')
    .select('user_id')
    .eq('id', data.orderId)
    .single()
  
  let locale: 'en' | 'id' = 'id'
  if (order?.user_id) {
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id)
    locale = (authUser?.user?.user_metadata?.preferred_language || 'id') as 'en' | 'id'
  }
  
  const t = locale === 'id' ? {
    title: 'Pesanan Anda Telah Sampai!',
    greeting: 'Halo',
    intro: 'Paket Anda telah berhasil diterima!',
    trackingLabel: 'Nomor Resi',
    deliveredLabel: 'Waktu Terima',
    thanks: 'Terima kasih telah berbelanja di Mykonos! Kami harap Anda menikmati produk kami.',
    feedback: 'Bagaimana pengalaman Anda?',
    feedbackText: 'Kami akan senang mendengar feedback Anda!'
  } : {
    title: 'Your Order Has Been Delivered!',
    greeting: 'Hello',
    intro: 'Your package has been successfully delivered!',
    trackingLabel: 'Tracking Number',
    deliveredLabel: 'Delivered At',
    thanks: 'Thank you for shopping with Mykonos! We hope you enjoy your products.',
    feedback: 'How was your experience?',
    feedbackText: 'We would love to hear your feedback!'
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="padding: 40px 30px;">
          <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 20px 0;">✅ ${t.title}</h1>
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 24px 0;">
            ${t.greeting} <strong>${data.customerName}</strong>,
          </p>
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 32px 0;">
            ${t.intro}
          </p>
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
              ${t.trackingLabel}
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 16px;">
              ${data.trackingNumber}
            </div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">
              ${t.deliveredLabel}
            </div>
            <div style="font-size: 16px; font-weight: 600; color: #ffffff;">
              ${formatDate(data.deliveredAt)}
            </div>
          </div>
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 32px; text-align: center;">
            <div style="font-weight: 600; color: #92400e; margin-bottom: 8px;">
              ${t.feedback}
            </div>
            <div style="color: #78350f; font-size: 14px;">
              ${t.feedbackText}
            </div>
          </div>
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0;">
            ${t.thanks}
          </p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const subject = locale === 'id' 
    ? `✅ Pesanan ${data.orderNumber} Telah Sampai!`
    : `✅ Order ${data.orderNumber} Has Been Delivered!`
  
  // Send email via Resend
  const { resend, FROM_EMAIL } = await import('@/lib/email/resend')
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.customerEmail,
    subject,
    html: emailHtml
  })
}
