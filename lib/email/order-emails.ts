import { resend, FROM_EMAIL, ADMIN_EMAIL } from './resend'
import { OrderConfirmationEmail } from './templates'
import { OrderStatusUpdateEmail } from './templates/order-status-update'
import { createClient } from '@supabase/supabase-js'
import { translations } from '@/lib/translations'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface OrderEmailData {
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string
}

/**
 * Log email to database for tracking and debugging
 */
async function logEmail(data: {
  orderId: string
  userId?: string
  type: 'order_confirmation' | 'payment_update' | 'order_status_update' | 'admin_notification'
  resendId: string
  resendMessageId?: string
  recipientEmail: string
  recipientName?: string
  subject: string
  status?: string
  errorMessage?: string
  emailData?: any
}) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await supabase.from('email_logs').insert({
      order_id: data.orderId,
      user_id: data.userId,
      email_type: data.type,
      resend_email_id: data.resendId,
      resend_message_id: data.resendMessageId,
      recipient_email: data.recipientEmail,
      recipient_name: data.recipientName,
      subject: data.subject,
      status: data.status || 'sent',
      error_message: data.errorMessage,
      email_data: data.emailData,
      sent_at: new Date().toISOString()
    })
    
    if (error) {
      console.error('❌ [EMAIL] Failed to log email to database:', error)
    } else {
      console.log('✅ [EMAIL] Email logged to database successfully')
    }
  } catch (error) {
    console.error('❌ [EMAIL] Exception logging email:', error)
  }
}

/**
 * Send order confirmation email when order is created
 * Uses email threading with References header
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  try {
    console.log('\n=== 📧 EMAIL CONFIRMATION START ===')
    console.log('📋 [EMAIL] Order Number:', data.orderNumber)
    console.log('📋 [EMAIL] Order ID:', data.orderId)
    console.log('📋 [EMAIL] Customer:', data.customerName, `<${data.customerEmail}>`)
    console.log('⏰ [EMAIL] Timestamp:', new Date().toISOString())
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Fetch full order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          variant_name,
          variant_sku,
          quantity,
          price_at_purchase,
          product:products (
            name,
            image_urls
          )
        )
      `)
      .eq('id', data.orderId)
      .single()
    
    if (orderError || !order) {
      console.error('❌ [EMAIL] Failed to fetch order:', orderError)
      return { success: false, error: 'Order not found' }
    }

    const typedOrder = order as any
    const items = typedOrder.order_items || []
    
    // Fetch user's preferred language separately from public.users table
    let userLanguage = 'en'
    if (typedOrder.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('preferred_language')
        .eq('id', typedOrder.user_id)
        .single()
      
      userLanguage = userData?.preferred_language || 'en'
    }
    
    const locale = userLanguage === 'id' ? 'id' : 'en'
    const t = translations[locale]
    
    console.log('✅ [EMAIL] Order fetched successfully')
    console.log('📊 [EMAIL] Order Status:', typedOrder.status)
    console.log('💳 [EMAIL] Payment Status:', typedOrder.payment_status)
    console.log('🔗 [EMAIL] Email Thread ID:', typedOrder.email_thread_id || 'NONE - This is first email')
    console.log('📊 [EMAIL] Order Status:', typedOrder.status)
    console.log('🌐 [EMAIL] User Language:', locale)
    
    console.log('📦 [EMAIL] Order Items Count:', items.length)
    console.log('💰 [EMAIL] Total Amount:', typedOrder.total_amount)
    console.log('📍 [EMAIL] Payment Status:', typedOrder.payment_status)
    console.log('📊 [EMAIL] Order Status:', typedOrder.status)
    console.log('🌐 [EMAIL] User Language:', locale)
    
    // Parse shipping address
    const shippingAddress = typedOrder.shipping_address || {}
    
    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price_at_purchase * item.quantity), 0)
    const shipping = typedOrder.shipping_cost || 0
    const discount = typedOrder.discount_amount || 0
    const total = typedOrder.total_amount || 0
    
    console.log('💵 [EMAIL] Subtotal:', subtotal)
    console.log('🚚 [EMAIL] Shipping:', shipping)
    console.log('🎟️ [EMAIL] Discount:', discount)
    console.log('💰 [EMAIL] Total:', total)
    
    // Consistent subject for threading
    const baseSubject = `Your Order ${data.orderNumber}`
    const preheader = `Your order has been received and is being prepared with care`
    
    // Build headers for email threading
    const headers: Record<string, string> = {
      'X-Entity-Ref-ID': data.orderNumber,
    }
    
    // Determine final subject based on whether this is a follow-up email
    let finalSubject = baseSubject
    
    // Add threading headers if this is a follow-up email
    if (typedOrder.email_thread_id) {
      console.log('🔗 [EMAIL] Adding threading headers for thread ID:', typedOrder.email_thread_id)
      headers['In-Reply-To'] = `<${typedOrder.email_thread_id}@resend.dev>`
      headers['References'] = `<${typedOrder.email_thread_id}@resend.dev>`
      // Use "Re:" prefix for follow-up emails
      finalSubject = `Re: ${baseSubject}`
      console.log('🔗 [EMAIL] This is a follow-up email - using threading')
    } else {
      console.log('📧 [EMAIL] This is the first email - will create new thread')
    }
    
    console.log('📝 [EMAIL] Subject:', finalSubject)
    console.log('👁️ [EMAIL] Preheader:', preheader)
    console.log('📤 [EMAIL] Sending to Resend API...')
    console.log('📧 [EMAIL] From:', FROM_EMAIL)
    console.log('📧 [EMAIL] To:', data.customerEmail)
    console.log('🔑 [EMAIL] Using API Key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...')
    
    // Send email using Resend with React component
    // ⚠️ DO NOT manually set Message-ID - Resend handles this automatically
    let emailData: any
    let emailError: any
    
    try {
      const response = await resend.emails.send({
        from: FROM_EMAIL,
        to: data.customerEmail,
        subject: finalSubject,
        text: preheader,
        headers,
        react: OrderConfirmationEmail({
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        orderDate: new Date(typedOrder.created_at).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        items: items.map((item: any) => ({
          product_name: item.product?.name || 'Product',
          variant_name: item.variant_name,
          quantity: item.quantity,
          price: item.price_at_purchase,
          total: item.price_at_purchase * item.quantity
        })),
        subtotal,
        shipping,
        discount,
        total,
        shippingAddress: {
          name: shippingAddress.full_name || data.customerName,
          phone: shippingAddress.phone || '',
          address: shippingAddress.address_line1 || shippingAddress.address || '',
          city: shippingAddress.city || '',
          province: shippingAddress.state_province || shippingAddress.province || '',
          postal_code: shippingAddress.postal_code || ''
        },
        paymentStatus: typedOrder.payment_status || 'pending',
        orderStatus: typedOrder.status || 'pending',
        locale,
        orderId: data.orderId,
        expiryTime: typedOrder.expiry_time ? new Date(typedOrder.expiry_time).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : undefined
      })
      })
      
      emailData = response.data
      emailError = response.error
      
      if (emailError) {
        console.error('\n❌ [EMAIL] SEND FAILED')
        console.error('❌ [EMAIL] Error:', emailError)
        console.error('❌ [EMAIL] Error Message:', emailError.message)
        console.error('❌ [EMAIL] Error Name:', emailError.name)
        console.error('=== 📧 EMAIL CONFIRMATION END (FAILED) ===\n')
        
        // Log failed email
        await logEmail({
          orderId: data.orderId,
          type: 'order_confirmation',
          resendId: 'failed',
          recipientEmail: data.customerEmail,
          subject: finalSubject,
          status: 'failed',
          errorMessage: emailError.message
        })
        return { success: false, error: emailError.message }
      }
    } catch (resendError: any) {
      console.error('\n❌ [EMAIL] RESEND API EXCEPTION')
      console.error('❌ [EMAIL] Error:', resendError)
      console.error('❌ [EMAIL] Error Message:', resendError.message)
      console.error('❌ [EMAIL] Error Stack:', resendError.stack)
      console.error('=== 📧 EMAIL CONFIRMATION END (RESEND ERROR) ===\n')
      
      await logEmail({
        orderId: data.orderId,
        type: 'order_confirmation',
        resendId: 'failed',
        recipientEmail: data.customerEmail,
        subject: finalSubject,
        status: 'failed',
        errorMessage: resendError.message
      })
      return { success: false, error: resendError.message }
    }
    
    console.log('\n✅ [EMAIL] Email sent successfully!')
    console.log('🆔 [EMAIL] Resend Email ID:', emailData?.id)
    console.log('📧 [EMAIL] From:', FROM_EMAIL)
    console.log('📧 [EMAIL] To:', data.customerEmail)
    
    // Store Resend's email ID for threading subsequent emails
    if (emailData?.id && !typedOrder.email_thread_id) {
      console.log('💾 [EMAIL] Storing thread ID in database...')
      await supabase
        .from('orders')
        .update({ email_thread_id: emailData.id })
        .eq('id', data.orderId)
      console.log('✅ [EMAIL] Thread ID stored:', emailData.id)
    } else if (typedOrder.email_thread_id) {
      console.log('ℹ️ [EMAIL] Thread ID already exists:', typedOrder.email_thread_id)
    }
    
    // Log successful email
    if (emailData?.id) {
      console.log('💾 [EMAIL] Logging email to database...')
      await logEmail({
        orderId: data.orderId,
        userId: typedOrder.user_id,
        type: 'order_confirmation',
        resendId: emailData.id,
        resendMessageId: emailData.id, // Resend uses email ID as Message-ID
        recipientEmail: data.customerEmail,
        recipientName: data.customerName,
        subject: finalSubject,
        status: 'sent',
        emailData: {
          orderNumber: data.orderNumber,
          orderDate: new Date(typedOrder.created_at).toISOString(),
          totalAmount: typedOrder.total_amount,
          itemCount: items.length
        }
      })
      console.log('✅ [EMAIL] Email logged to database')
    }
    
    // Send notification to admin (separate thread - NOT in customer thread)
    console.log('\n📤 [EMAIL] Sending admin notification...')
    console.log('📧 [EMAIL] Admin Email:', ADMIN_EMAIL)
    
    const adminEmailData = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[New Order] ${data.orderNumber} — ${data.customerName}`,
      // ✅ DO NOT include In-Reply-To or References - this is a separate thread
      html: `
        <h2>New Order Received</h2>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
        <p><strong>Total:</strong> Rp${total.toLocaleString('id-ID')}</p>
        <p><strong>Items:</strong> ${items.length}</p>
        <p><a href="https://mykonos.com/cms/orders/${data.orderId}">View Order in CMS</a></p>
      `
    })
    
    // Log admin email
    if (adminEmailData.data?.id) {
      console.log('✅ [EMAIL] Admin notification sent:', adminEmailData.data.id)
      await logEmail({
        orderId: data.orderId,
        type: 'admin_notification',
        resendId: adminEmailData.data.id,
        recipientEmail: ADMIN_EMAIL,
        subject: `[New Order] ${data.orderNumber} — ${data.customerName}`
      })
    } else if (adminEmailData.error) {
      console.error('⚠️ [EMAIL] Admin notification failed:', adminEmailData.error)
    }
    
    console.log('=== 📧 EMAIL CONFIRMATION END (SUCCESS) ===\n')
    return { success: true, emailId: emailData?.id }
  } catch (error: any) {
    console.error('\n❌ [EMAIL] EXCEPTION in sendOrderConfirmationEmail')
    console.error('❌ [EMAIL] Error:', error)
    console.error('❌ [EMAIL] Stack:', error.stack)
    console.error('=== 📧 EMAIL CONFIRMATION END (EXCEPTION) ===\n')
    return { success: false, error: error.message }
  }
}

/**
 * Send order status update email
 * Uses email threading to keep all updates in same thread
 */
export async function sendOrderStatusUpdateEmail(data: {
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string
  orderStatus: string
  paymentStatus: string
  trackingNumber?: string
}) {
  try {
    console.log('\n=== 📧 EMAIL STATUS UPDATE START ===')
    console.log('📋 [EMAIL] Order Number:', data.orderNumber)
    console.log('📋 [EMAIL] Order ID:', data.orderId)
    console.log('📋 [EMAIL] Customer:', data.customerName, `<${data.customerEmail}>`)
    console.log('📊 [EMAIL] Order Status:', data.orderStatus)
    console.log('💳 [EMAIL] Payment Status:', data.paymentStatus)
    console.log('📦 [EMAIL] Tracking Number:', data.trackingNumber || 'N/A')
    console.log('⏰ [EMAIL] Timestamp:', new Date().toISOString())
    
    // Reuse the sendOrderConfirmationEmail function which has all the order details
    // This will fetch the latest order data including updated order status
    console.log('📧 [EMAIL] Calling sendOrderConfirmationEmail with updated order status...')
    return await sendOrderConfirmationEmail({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      customerEmail: data.customerEmail,
      customerName: data.customerName
    })
  } catch (error: any) {
    console.error('\n❌ [EMAIL] EXCEPTION in sendOrderStatusUpdateEmail')
    console.error('❌ [EMAIL] Error:', error)
    console.error('❌ [EMAIL] Stack:', error.stack)
    console.error('=== 📧 EMAIL STATUS UPDATE END (EXCEPTION) ===\n')
    return { success: false, error: error.message }
  }
}

// Old implementation kept for reference (unused)
const oldSendOrderStatusUpdateEmailImplementation = async (data: any) => {
  try {
    console.log('Old implementation - not used anymore')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Fetch thread ID from database
    const { data: order } = await supabase
      .from('orders')
      .select('email_thread_id')
      .eq('id', data.orderId)
      .single()
    
    const typedOrder = order as any
    const threadId = typedOrder?.email_thread_id // Resend email ID from first email
    
    console.log('🔗 [EMAIL] Thread ID from DB:', threadId || 'NOT FOUND')
    if (!threadId) {
      console.warn('⚠️ [EMAIL] No thread ID found - email may not thread properly')
    }
    
    // Consistent subject for threading (Gmail/Outlook rely on this)
    const subject = `Re: Your Order ${data.orderNumber}`
    
    // Luxury messaging in preheader and body
    let statusMessage = ''
    let preheader = ''
    
    switch (data.orderStatus) {
      case 'processing':
        statusMessage = 'Your fragrance is being carefully prepared in our atelier.'
        preheader = 'Our artisans are preparing your order with care'
        break
      case 'packed':
        statusMessage = 'Your order has been packed and will ship soon.'
        preheader = 'Your fragrance is packed and ready'
        break
      case 'shipped':
        statusMessage = 'Your fragrance has left our atelier and is on its way to you.'
        preheader = 'Your order is on its way'
        break
      case 'out_for_delivery':
        statusMessage = 'Your fragrance will arrive today.'
        preheader = 'Your order is out for delivery'
        break
      case 'delivered':
        statusMessage = 'Your fragrance has arrived. We hope you love it.'
        preheader = 'Your order has been delivered'
        break
      case 'cancelled':
        statusMessage = 'Your order has been cancelled.'
        preheader = 'Your order has been cancelled'
        break
      default:
        statusMessage = `Your order status has been updated to ${data.orderStatus}.`
        preheader = `Status: ${data.orderStatus}`
    }
    
    // Payment status messages
    if (data.paymentStatus === 'completed' && data.orderStatus === 'pending') {
      statusMessage = 'Payment received. Your order will be processed shortly.'
      preheader = 'Your payment has been received'
    }
    
    console.log('📝 [EMAIL] Subject:', subject)
    console.log('👁️ [EMAIL] Preheader:', preheader)
    console.log('💬 [EMAIL] Status Message:', statusMessage)
    
    // Build headers for threading
    const headers: Record<string, string> = {
      'X-Entity-Ref-ID': data.orderNumber,
    }
    
    // Use Resend's email ID for threading (if available)
    if (threadId) {
      headers['In-Reply-To'] = `<${threadId}@resend.com>`
      headers['References'] = `<${threadId}@resend.com>`
      console.log('🔗 [EMAIL] Threading Headers:')
      console.log('   In-Reply-To:', headers['In-Reply-To'])
      console.log('   References:', headers['References'])
    } else {
      console.warn('⚠️ [EMAIL] No threading headers - first email may not have been sent')
    }
    
    console.log('📤 [EMAIL] Sending to Resend API...')
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: subject,
      text: preheader,
      headers,
      react: OrderStatusUpdateEmail({
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        orderStatus: data.orderStatus,
        paymentStatus: data.paymentStatus,
        statusMessage,
        trackingNumber: data.trackingNumber
      })
    })
    
    if (emailError) {
      console.error('\n❌ [EMAIL] SEND FAILED')
      console.error('❌ [EMAIL] Error:', emailError)
      console.error('❌ [EMAIL] Error Message:', emailError.message)
      console.error('=== 📧 EMAIL STATUS UPDATE END (FAILED) ===\n')
      await logEmail({
        orderId: data.orderId,
        type: 'order_status_update',
        resendId: 'failed',
        recipientEmail: data.customerEmail,
        subject: subject,
        status: 'failed',
        errorMessage: emailError.message
      })
      return { success: false, error: emailError.message }
    }
    
    console.log('\n✅ [EMAIL] Status update sent successfully!')
    console.log('🆔 [EMAIL] Resend Email ID:', emailData?.id)
    console.log('📧 [EMAIL] From:', FROM_EMAIL)
    console.log('📧 [EMAIL] To:', data.customerEmail)
    
    // Log successful email
    if (emailData?.id) {
      console.log('💾 [EMAIL] Logging email to database...')
      await logEmail({
        orderId: data.orderId,
        type: 'order_status_update',
        resendId: emailData.id,
        recipientEmail: data.customerEmail,
        subject: subject
      })
    }
    
    console.log('=== 📧 EMAIL STATUS UPDATE END (SUCCESS) ===\n')
    return { success: true, emailId: emailData?.id }
  } catch (error: any) {
    console.error('\n❌ [EMAIL] EXCEPTION in sendOrderStatusUpdateEmail')
    console.error('❌ [EMAIL] Error:', error)
    console.error('❌ [EMAIL] Stack:', error.stack)
    console.error('=== 📧 EMAIL STATUS UPDATE END (EXCEPTION) ===\n')
    return { success: false, error: error.message }
  }
}

/**
 * Send payment status update email
 */
export async function sendPaymentStatusUpdateEmail(data: {
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string
  paymentStatus: string
  transactionStatus?: string
}) {
  try {
    console.log('\n=== 📧 EMAIL PAYMENT UPDATE START ===')
    console.log('📋 [EMAIL] Order Number:', data.orderNumber)
    console.log('📋 [EMAIL] Order ID:', data.orderId)
    console.log('📋 [EMAIL] Customer:', data.customerName, `<${data.customerEmail}>`)
    console.log('💳 [EMAIL] Payment Status:', data.paymentStatus)
    console.log('🔄 [EMAIL] Transaction Status:', data.transactionStatus || 'N/A')
    console.log('⏰ [EMAIL] Timestamp:', new Date().toISOString())
    
    // Reuse the sendOrderConfirmationEmail function which has all the order details
    // This will fetch the latest order data including updated payment status
    console.log('📧 [EMAIL] Calling sendOrderConfirmationEmail with updated payment status...')
    return await sendOrderConfirmationEmail({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      customerEmail: data.customerEmail,
      customerName: data.customerName
    })
  } catch (error: any) {
    console.error('\n❌ [EMAIL] EXCEPTION in sendPaymentStatusUpdateEmail')
    console.error('❌ [EMAIL] Error:', error)
    console.error('❌ [EMAIL] Stack:', error.stack)
    console.error('=== 📧 EMAIL PAYMENT UPDATE END (EXCEPTION) ===\n')
    return { success: false, error: error.message }
  }
}
