import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderShippedEmail } from '@/lib/email/order-emails'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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
  
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📨 DHL Webhook Received [${requestId}]`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Parse webhook payload
    const payload = await request.json()
    console.log('📦 Webhook Payload:', JSON.stringify(payload, null, 2))
    
    // Verify DHL signature (if configured)
    const signature = request.headers.get('x-dhl-signature')
    if (process.env.DHL_WEBHOOK_SECRET && signature) {
      // TODO: Implement signature verification
      console.log('🔐 Signature verification:', signature)
    }
    
    // Extract event data
    const event = payload.event || payload.eventType
    const trackingNumber = payload.trackingNumber || payload.shipmentTrackingNumber
    const timestamp = payload.timestamp || new Date().toISOString()
    
    console.log('📋 Event Type:', event)
    console.log('🔢 Tracking Number:', trackingNumber)
    console.log('⏰ Timestamp:', timestamp)
    
    if (!trackingNumber) {
      console.error('❌ No tracking number in webhook payload')
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
      console.error('❌ Order not found for tracking number:', trackingNumber)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    console.log('✅ Order found:', order.order_number)
    
    // Process event based on type
    let updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    let shouldSendEmail = false
    let emailType: 'shipped' | 'delivered' | 'exception' = 'shipped'
    
    switch (event) {
      case 'shipment-picked-up':
      case 'PICKUP':
        console.log('📦 Package picked up')
        updateData.status = 'shipped'
        if (!order.shipped_at) {
          updateData.shipped_at = timestamp
          shouldSendEmail = true
          emailType = 'shipped'
        }
        break
        
      case 'shipment-in-transit':
      case 'TRANSIT':
        console.log('🚚 Package in transit')
        updateData.status = 'shipped'
        break
        
      case 'shipment-out-for-delivery':
      case 'OUT_FOR_DELIVERY':
        console.log('🚛 Out for delivery')
        updateData.status = 'shipped'
        // Could add a new status field for "out for delivery"
        break
        
      case 'shipment-delivered':
      case 'DELIVERED':
        console.log('✅ Package delivered')
        updateData.status = 'delivered'
        updateData.delivered_at = timestamp
        shouldSendEmail = true
        emailType = 'delivered'
        break
        
      case 'shipment-exception':
      case 'EXCEPTION':
        console.log('⚠️  Delivery exception')
        updateData.internal_notes = `Delivery exception: ${payload.description || 'Unknown issue'}`
        shouldSendEmail = true
        emailType = 'exception'
        break
        
      case 'shipment-returned':
      case 'RETURNED':
        console.log('↩️  Package returned to sender')
        updateData.status = 'cancelled'
        updateData.internal_notes = `Package returned: ${payload.description || 'Unknown reason'}`
        break
        
      default:
        console.log('ℹ️  Unknown event type:', event)
    }
    
    // Update order in database
    console.log('💾 Updating order...')
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)
    
    if (updateError) {
      console.error('❌ Failed to update order:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }
    
    console.log('✅ Order updated successfully')
    
    // Send email notification if needed
    if (shouldSendEmail && order.customer_email) {
      console.log('📧 Sending email notification...')
      try {
        if (emailType === 'delivered') {
          // Send delivery confirmation email
          await sendDeliveryConfirmationEmail({
            orderId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.customer_email,
            customerName: order.shipping_address?.full_name || order.customer_email.split('@')[0],
            trackingNumber: trackingNumber,
            deliveredAt: timestamp
          })
        } else if (emailType === 'shipped' && !order.shipped_at) {
          // Send shipping notification (if not already sent)
          await sendOrderShippedEmail({
            orderId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.customer_email,
            customerName: order.shipping_address?.full_name || order.customer_email.split('@')[0],
            trackingNumber: trackingNumber,
            trackingUrl: order.tracking_url || `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}&brand=DHL`
          })
        }
        console.log('✅ Email sent successfully')
      } catch (emailError: any) {
        console.error('⚠️  Failed to send email:', emailError.message)
        // Don't fail the webhook if email fails
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✨ Webhook Processed Successfully [${requestId}]`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
      orderNumber: order.order_number,
      event
    })
    
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(`💥 Webhook Processing Failed [${requestId}]`)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('⚠️  Error Type:', error.name)
    console.error('💬 Error Message:', error.message)
    console.error('📚 Stack Trace:', error.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
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
