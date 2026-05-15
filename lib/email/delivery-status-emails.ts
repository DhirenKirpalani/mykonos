import { resend, FROM_EMAIL } from './resend'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface DeliveryStatusEmailData {
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string
  trackingNumber: string
  timestamp?: string
  description?: string
  location?: string
  estimatedDelivery?: string
  attemptNumber?: number
  reason?: string
}

/**
 * Get language based on order's region
 */
async function getUserLocale(orderId: string): Promise<'en' | 'id'> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Get order with region information
  const { data: order } = await supabase
    .from('orders')
    .select('region_id, regions!inner(language_code)')
    .eq('id', orderId)
    .single()
  
  // Use region's language if available
  const regions = order?.regions as any
  if (regions?.language_code) {
    return regions.language_code as 'en' | 'id'
  }
  
  // Fallback to English
  return 'en'
}

/**
 * Format date for display
 */
function formatDate(dateString: string, locale: 'en' | 'id'): string {
  return new Date(dateString).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Base email HTML template
 */
function createEmailHTML(data: {
  locale: 'en' | 'id'
  title: string
  emoji: string
  greeting: string
  customerName: string
  mainMessage: string
  trackingNumber: string
  additionalInfo?: string
  ctaText?: string
  ctaUrl?: string
  footerMessage: string
  backgroundColor: string
  iconColor: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        /* Mobile Responsive Styles */
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; max-width: 100% !important; }
          .content { padding: 20px 16px !important; }
          .header { padding: 30px 20px !important; }
          .banner { padding: 24px 16px !important; }
          .logo { font-size: 28px !important; letter-spacing: 0.2em !important; }
          .tagline { font-size: 12px !important; }
          .heading { font-size: 22px !important; line-height: 1.3 !important; }
          .button { 
            padding: 14px 24px !important; 
            font-size: 15px !important; 
            width: calc(100% - 32px) !important; 
            max-width: 100% !important;
            display: block !important;
            box-sizing: border-box !important;
          }
          .tracking-box { padding: 20px 16px !important; }
          .tracking-number { font-size: 18px !important; }
          .footer { padding: 24px 16px !important; }
          .footer-logo { font-size: 18px !important; }
        }
        /* Prevent text from being too small */
        @media only screen and (max-width: 480px) {
          body { font-size: 14px !important; }
          .heading { font-size: 20px !important; }
        }
      </style>
    </head>
    <body style="font-family: 'Lato', 'Gill Sans', sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div class="header" style="background: #071D49; padding: 40px 30px; text-align: center;">
          <h1 class="logo" style="font-family: 'Montserrat', sans-serif; font-size: 36px; font-weight: 400; color: #D9B25E; background: linear-gradient(90deg, #D9B25E 0%, #FEE19D 50%, #D9B25E 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 8px 0; letter-spacing: 0.25em;">
            MYKONOS
          </h1>
          <p class="tagline" style="font-size: 14px; color: rgba(255, 255, 255, 0.6); margin: 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em;">
            Modern & Vibrant Perfumery
          </p>
        </div>
        
        <!-- Banner -->
        <div class="banner" style="background: #B8985F; padding: 32px 30px; text-align: center;">
          <h2 class="heading" style="font-size: 28px; font-weight: 700; color: #071D49; margin: 0;">
            ${data.emoji} ${data.title}
          </h2>
        </div>
        
        <!-- Content -->
        <div class="content" style="padding: 40px 30px;">
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 24px 0;">
            ${data.greeting} <strong>${data.customerName}</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 32px 0;">
            ${data.mainMessage}
          </p>
          
          <!-- Tracking Info -->
          <div class="tracking-box" style="background: ${data.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
            <div style="font-size: 14px; color: rgba(0,0,0,0.6); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
              ${data.locale === 'id' ? 'Nomor Resi' : 'Tracking Number'}
            </div>
            <div class="tracking-number" style="font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; color: ${data.iconColor}; margin-bottom: 16px;">
              ${data.trackingNumber}
            </div>
            ${data.additionalInfo ? `
              <div style="font-size: 14px; color: rgba(0,0,0,0.7); margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);">
                ${data.additionalInfo}
              </div>
            ` : ''}
          </div>
          
          ${data.ctaText && data.ctaUrl ? `
            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${data.ctaUrl}" class="button" style="display: inline-block; padding: 16px 32px; background: #071D49; color: #B8985F; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; min-width: 200px; text-align: center;">
                ${data.ctaText}
              </a>
            </div>
          ` : ''}
          
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0;">
            ${data.footerMessage}
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer" style="background: #071D49; padding: 30px; text-align: center; border-top: 3px solid #B8985F;">
          <p style="font-size: 14px; color: rgba(255, 255, 255, 0.6); margin: 0 0 8px 0;">
            ${data.locale === 'id' ? 'Terima kasih telah berbelanja di' : 'Thank you for shopping with'}
          </p>
          <p class="footer-logo" style="font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 400; color: #D9B25E; background: linear-gradient(90deg, #D9B25E 0%, #FEE19D 50%, #D9B25E 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 4px 0; letter-spacing: 0.25em;">
            MYKONOS
          </p>
          <p class="tagline" style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin: 0 0 16px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em;">
            Modern & Vibrant Perfumery
          </p>
          <p style="font-size: 11px; color: rgba(255, 255, 255, 0.4); margin: 0;">
            ${data.locale === 'id' ? 'Email otomatis, mohon tidak membalas' : 'This is an automated email, please do not reply'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * 1. Out for Delivery Email
 */
export async function sendOutForDeliveryEmail(data: DeliveryStatusEmailData) {
  const locale = await getUserLocale(data.orderId)
  
  const t = locale === 'id' ? {
    title: 'Paket Anda Sedang Dikirim!',
    greeting: 'Halo',
    mainMessage: 'Kabar baik! Paket Anda sedang dalam perjalanan untuk dikirim hari ini. Kurir kami akan segera tiba di lokasi Anda.',
    trackingLabel: 'Nomor Resi',
    estimatedLabel: 'Estimasi Tiba',
    ctaText: 'Lacak Paket',
    footerMessage: 'Pastikan ada yang menerima paket di alamat tujuan. Jika Anda tidak ada di rumah, kurir akan meninggalkan pemberitahuan.',
    today: 'Hari ini'
  } : {
    title: 'Your Package is Out for Delivery!',
    greeting: 'Hello',
    mainMessage: 'Great news! Your package is on its way and will be delivered today. Our courier will arrive at your location soon.',
    trackingLabel: 'Tracking Number',
    estimatedLabel: 'Estimated Arrival',
    ctaText: 'Track Package',
    footerMessage: 'Please ensure someone is available to receive the package at the delivery address. If you\'re not home, the courier will leave a notice.',
    today: 'Today'
  }
  
  const additionalInfo = data.estimatedDelivery 
    ? `<strong>${t.estimatedLabel}:</strong> ${formatDate(data.estimatedDelivery, locale)}`
    : `<strong>${t.estimatedLabel}:</strong> ${t.today}`
  
  const emailHtml = createEmailHTML({
    locale,
    title: t.title,
    emoji: '🚛',
    greeting: t.greeting,
    customerName: data.customerName,
    mainMessage: t.mainMessage,
    trackingNumber: data.trackingNumber,
    additionalInfo,
    ctaText: t.ctaText,
    ctaUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${data.trackingNumber}&brand=DHL`,
    footerMessage: t.footerMessage,
    backgroundColor: '#dbeafe',
    iconColor: '#2563eb'
  })
  
  const subject = locale === 'id' 
    ? `🚛 Paket ${data.orderNumber} Sedang Dikirim!`
    : `🚛 Package ${data.orderNumber} is Out for Delivery!`
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.customerEmail,
    subject,
    html: emailHtml
  })
}

/**
 * 2. Delivery Attempted Email
 */
export async function sendDeliveryAttemptedEmail(data: DeliveryStatusEmailData) {
  const locale = await getUserLocale(data.orderId)
  
  const t = locale === 'id' ? {
    title: 'Pengiriman Tidak Berhasil',
    greeting: 'Halo',
    mainMessage: `Kurir kami telah mencoba mengirim paket Anda, tetapi tidak ada yang menerima di alamat tujuan. Ini adalah percobaan pengiriman ke-${data.attemptNumber || 1}.`,
    reasonLabel: 'Alasan',
    nextAttemptLabel: 'Percobaan Berikutnya',
    ctaText: 'Atur Ulang Pengiriman',
    footerMessage: 'Jika Anda memerlukan bantuan atau ingin mengubah jadwal pengiriman, silakan hubungi kami.',
    tomorrow: 'Besok'
  } : {
    title: 'Delivery Attempt Failed',
    greeting: 'Hello',
    mainMessage: `Our courier attempted to deliver your package, but no one was available to receive it at the delivery address. This was delivery attempt #${data.attemptNumber || 1}.`,
    reasonLabel: 'Reason',
    nextAttemptLabel: 'Next Attempt',
    ctaText: 'Reschedule Delivery',
    footerMessage: 'If you need assistance or want to change the delivery schedule, please contact us.',
    tomorrow: 'Tomorrow'
  }
  
  const additionalInfo = `
    ${data.reason ? `<strong>${t.reasonLabel}:</strong> ${data.reason}<br>` : ''}
    <strong>${t.nextAttemptLabel}:</strong> ${t.tomorrow}
  `
  
  const emailHtml = createEmailHTML({
    locale,
    title: t.title,
    emoji: '📭',
    greeting: t.greeting,
    customerName: data.customerName,
    mainMessage: t.mainMessage,
    trackingNumber: data.trackingNumber,
    additionalInfo,
    ctaText: t.ctaText,
    ctaUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${data.trackingNumber}&brand=DHL`,
    footerMessage: t.footerMessage,
    backgroundColor: '#fef3c7',
    iconColor: '#f59e0b'
  })
  
  const subject = locale === 'id' 
    ? `📭 Pengiriman ${data.orderNumber} Tidak Berhasil`
    : `📭 Delivery Attempt Failed for ${data.orderNumber}`
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.customerEmail,
    subject,
    html: emailHtml
  })
}

/**
 * 3. Shipment Delayed Email
 */
export async function sendShipmentDelayedEmail(data: DeliveryStatusEmailData) {
  const locale = await getUserLocale(data.orderId)
  
  const t = locale === 'id' ? {
    title: 'Pengiriman Tertunda',
    greeting: 'Halo',
    mainMessage: 'Kami ingin memberitahu Anda bahwa pengiriman paket Anda mengalami keterlambatan. Kami mohon maaf atas ketidaknyamanan ini.',
    reasonLabel: 'Alasan',
    newEstimateLabel: 'Estimasi Baru',
    ctaText: 'Lacak Paket',
    footerMessage: 'Kami sedang bekerja untuk mengirimkan paket Anda sesegera mungkin. Terima kasih atas kesabaran Anda.'
  } : {
    title: 'Shipment Delayed',
    greeting: 'Hello',
    mainMessage: 'We want to inform you that your package delivery has been delayed. We apologize for any inconvenience this may cause.',
    reasonLabel: 'Reason',
    newEstimateLabel: 'New Estimate',
    ctaText: 'Track Package',
    footerMessage: 'We are working to deliver your package as soon as possible. Thank you for your patience.'
  }
  
  const additionalInfo = `
    ${data.description ? `<strong>${t.reasonLabel}:</strong> ${data.description}<br>` : ''}
    ${data.estimatedDelivery ? `<strong>${t.newEstimateLabel}:</strong> ${formatDate(data.estimatedDelivery, locale)}` : ''}
  `
  
  const emailHtml = createEmailHTML({
    locale,
    title: t.title,
    emoji: '⏰',
    greeting: t.greeting,
    customerName: data.customerName,
    mainMessage: t.mainMessage,
    trackingNumber: data.trackingNumber,
    additionalInfo,
    ctaText: t.ctaText,
    ctaUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${data.trackingNumber}&brand=DHL`,
    footerMessage: t.footerMessage,
    backgroundColor: '#fef3c7',
    iconColor: '#f59e0b'
  })
  
  const subject = locale === 'id' 
    ? `⏰ Pengiriman ${data.orderNumber} Tertunda`
    : `⏰ Shipment ${data.orderNumber} Delayed`
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.customerEmail,
    subject,
    html: emailHtml
  })
}

/**
 * 4. Delivery Exception Email
 */
export async function sendDeliveryExceptionEmail(data: DeliveryStatusEmailData) {
  const locale = await getUserLocale(data.orderId)
  
  const t = locale === 'id' ? {
    title: 'Masalah Pengiriman',
    greeting: 'Halo',
    mainMessage: 'Kami mengalami masalah dengan pengiriman paket Anda. Tim kami sedang menangani situasi ini untuk menyelesaikannya sesegera mungkin.',
    issueLabel: 'Masalah',
    locationLabel: 'Lokasi',
    ctaText: 'Hubungi Dukungan',
    footerMessage: 'Jika Anda memiliki pertanyaan atau kekhawatiran, jangan ragu untuk menghubungi tim dukungan kami.'
  } : {
    title: 'Delivery Exception',
    greeting: 'Hello',
    mainMessage: 'We encountered an issue with your package delivery. Our team is working on this situation to resolve it as soon as possible.',
    issueLabel: 'Issue',
    locationLabel: 'Location',
    ctaText: 'Contact Support',
    footerMessage: 'If you have any questions or concerns, please don\'t hesitate to contact our support team.'
  }
  
  const additionalInfo = `
    ${data.description ? `<strong>${t.issueLabel}:</strong> ${data.description}<br>` : ''}
    ${data.location ? `<strong>${t.locationLabel}:</strong> ${data.location}` : ''}
  `
  
  const emailHtml = createEmailHTML({
    locale,
    title: t.title,
    emoji: '⚠️',
    greeting: t.greeting,
    customerName: data.customerName,
    mainMessage: t.mainMessage,
    trackingNumber: data.trackingNumber,
    additionalInfo,
    ctaText: t.ctaText,
    ctaUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${data.trackingNumber}&brand=DHL`,
    footerMessage: t.footerMessage,
    backgroundColor: '#fee2e2',
    iconColor: '#dc2626'
  })
  
  const subject = locale === 'id' 
    ? `⚠️ Masalah Pengiriman ${data.orderNumber}`
    : `⚠️ Delivery Exception for ${data.orderNumber}`
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.customerEmail,
    subject,
    html: emailHtml
  })
}

/**
 * 5. Package Returned Email
 */
export async function sendPackageReturnedEmail(data: DeliveryStatusEmailData) {
  const locale = await getUserLocale(data.orderId)
  
  const t = locale === 'id' ? {
    title: 'Paket Dikembalikan',
    greeting: 'Halo',
    mainMessage: 'Paket Anda telah dikembalikan ke pengirim karena tidak dapat dikirim ke alamat tujuan.',
    reasonLabel: 'Alasan',
    refundLabel: 'Pengembalian Dana',
    ctaText: 'Lihat Detail Pesanan',
    footerMessage: 'Kami akan memproses pengembalian dana Anda dalam 3-5 hari kerja. Jika Anda ingin memesan ulang, silakan hubungi kami.',
    refundInfo: 'Akan diproses dalam 3-5 hari kerja'
  } : {
    title: 'Package Returned',
    greeting: 'Hello',
    mainMessage: 'Your package has been returned to the sender as it could not be delivered to the destination address.',
    reasonLabel: 'Reason',
    refundLabel: 'Refund',
    ctaText: 'View Order Details',
    footerMessage: 'We will process your refund within 3-5 business days. If you would like to reorder, please contact us.',
    refundInfo: 'Will be processed within 3-5 business days'
  }
  
  const additionalInfo = `
    ${data.description ? `<strong>${t.reasonLabel}:</strong> ${data.description}<br>` : ''}
    <strong>${t.refundLabel}:</strong> ${t.refundInfo}
  `
  
  const emailHtml = createEmailHTML({
    locale,
    title: t.title,
    emoji: '↩️',
    greeting: t.greeting,
    customerName: data.customerName,
    mainMessage: t.mainMessage,
    trackingNumber: data.trackingNumber,
    additionalInfo,
    ctaText: t.ctaText,
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mykonos-test.vercel.app'}/account/orders`,
    footerMessage: t.footerMessage,
    backgroundColor: '#fee2e2',
    iconColor: '#dc2626'
  })
  
  const subject = locale === 'id' 
    ? `↩️ Paket ${data.orderNumber} Dikembalikan`
    : `↩️ Package ${data.orderNumber} Returned`
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.customerEmail,
    subject,
    html: emailHtml
  })
}
