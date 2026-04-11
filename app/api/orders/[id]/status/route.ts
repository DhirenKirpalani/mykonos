import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { sendOrderStatusUpdateEmail } from '@/lib/email/order-emails'
export const dynamic = 'force-dynamic'

/**
 * Update order status
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { id } = params
    const body = await request.json()
    const { status, note } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'paid', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Server-side validation: Can only ship orders that are packed
    if (status === 'shipped') {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', id)
        .single()

      if (orderError) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      if (order.status !== 'packed') {
        return NextResponse.json(
          { error: 'Order must be marked as packed before it can be shipped' },
          { status: 400 }
        )
      }
    }

    // Use database function to update status
    const { error } = await supabase.rpc('update_order_status', {
      p_order_id: id,
      p_new_status: status,
      p_note: note || null,
    } as any)

    if (error) throw error

    // Get order details for email notification
    const { data: order } = await supabase
      .from('orders')
      .select('order_number, customer_email, user_id, shipping_address, payment_status, tracking_number')
      .eq('id', id)
      .single()

    // Send email notification for status update
    if (order) {
      const typedOrder = order as any
      
      // Get customer name from user profile or shipping address
      let customerName = 'Customer'
      
      if (typedOrder.user_id) {
        console.log('👤 [API] Fetching user data for user_id:', typedOrder.user_id)
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', typedOrder.user_id)
          .single()
        
        if (userData && (userData.first_name || userData.last_name)) {
          customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
          console.log('✅ [API] Customer name from users table:', customerName)
        }
      }
      
      // Fallback to shipping address name or email username
      if (customerName === 'Customer') {
        const shippingAddress = typedOrder.shipping_address || {}
        customerName = shippingAddress.full_name || typedOrder.customer_email?.split('@')[0] || 'Customer'
        console.log('⚠️ [API] Using fallback customer name:', customerName)
      }
      
      if (typedOrder.customer_email) {
        console.log('📧 [API] Sending order status update email...')
        sendOrderStatusUpdateEmail({
          orderId: id,
          orderNumber: typedOrder.order_number,
          customerEmail: typedOrder.customer_email,
          customerName: customerName,
          orderStatus: status,
          paymentStatus: typedOrder.payment_status,
          trackingNumber: typedOrder.tracking_number
        }).catch(error => {
          console.error('❌ [API] Failed to send status update email (non-blocking):', error)
        })
      }
      
      // Create notification for status update
      if (typedOrder.user_id) {
        let notificationTitle = ''
        let notificationMessage = ''
        
        switch (status) {
          case 'processing':
            notificationTitle = 'Order Processing'
            notificationMessage = `Your order #${typedOrder.order_number} is now being processed.`
            break
          case 'packed':
            notificationTitle = 'Order Packed 📦'
            notificationMessage = `Your order #${typedOrder.order_number} has been packed and will ship soon.`
            break
          case 'shipped':
            notificationTitle = 'Order Shipped 🚚'
            notificationMessage = `Your order #${typedOrder.order_number} has been shipped${typedOrder.tracking_number ? `. Tracking: ${typedOrder.tracking_number}` : ''}.`
            break
          case 'out_for_delivery':
            notificationTitle = 'Out for Delivery 🚛'
            notificationMessage = `Your order #${typedOrder.order_number} is out for delivery and will arrive soon.`
            break
          case 'delivered':
            notificationTitle = 'Order Delivered ✅'
            notificationMessage = `Your order #${typedOrder.order_number} has been delivered. Enjoy your fragrance!`
            break
          case 'cancelled':
            notificationTitle = 'Order Cancelled'
            notificationMessage = `Your order #${typedOrder.order_number} has been cancelled.`
            break
        }
        
        if (notificationTitle) {
          console.log('🔔 [API] Creating notification for status update...')
          supabase.from('notifications').insert({
            user_id: typedOrder.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: 'order',
            link: `/account/orders/${id}`,
            read: false
          } as any).then(({ error }) => {
            if (error) console.error('❌ [API] Failed to create notification:', error)
            else console.log('✅ [API] Notification created successfully')
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Order status updated successfully',
    })
  } catch (error: any) {
    console.error('Order status update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update order status' },
      { status: 500 }
    )
  }
}
