import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { sendOrderConfirmationEmail } from '@/lib/email/order-emails'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Create order BEFORE payment (Order-First Architecture)
 * This endpoint creates an order with pending payment status
 */
export async function POST(request: Request) {
  try {
    console.log('🔵 [API] POST /api/orders/create-before-payment - Creating order before payment')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { 
      checkout_session_id, 
      snap_token, 
      snap_redirect_url,
      user_id,
      session_id 
    } = body
    
    console.log('📥 [API] Request body:', { checkout_session_id, user_id, session_id })

    if (!checkout_session_id) {
      console.error('❌ [API] Missing checkout_session_id')
      return NextResponse.json(
        { error: 'Checkout session ID required' },
        { status: 400 }
      )
    }

    // Check for existing pending order with SAME cart items
    console.log('🔍 [API] Checking for duplicate pending orders...')
    
    // Get current checkout session cart items
    const { data: currentSession } = await supabase
      .from('checkout_sessions')
      .select('cart_snapshot')
      .eq('id', checkout_session_id)
      .single()
    
    if (currentSession) {
      const currentCart = currentSession.cart_snapshot as any[]
      
      // Get customer email from checkout session for email-based duplicate prevention
      const { data: sessionData } = await supabase
        .from('checkout_sessions')
        .select('customer_email')
        .eq('id', checkout_session_id)
        .single()
      
      const customerEmail = sessionData?.customer_email || null
      
      // Find pending orders for this user (by user_id, session_id, OR email)
      const { data: existingOrderId } = await supabase.rpc('find_pending_order', {
        p_user_id: user_id || null,
        p_session_id: session_id || null,
        p_customer_email: customerEmail
      } as any)
      
      if (existingOrderId) {
        console.log('✅ [API] Found existing pending order:', existingOrderId)
        
        // Get existing order items
        const { data: existingOrderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', existingOrderId)
        
        // Compare cart items with existing order items
        const cartMatches = currentCart.length === existingOrderItems?.length &&
          currentCart.every(cartItem => 
            existingOrderItems?.some(orderItem => 
              orderItem.product_id === cartItem.product_id && 
              orderItem.quantity === cartItem.quantity
            )
          )
        
        if (cartMatches) {
          console.log('♻️ [API] Cart matches existing order - reusing to prevent duplicate reservations')
          
          // Get order details
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id, order_number, snap_token, snap_redirect_url, expiry_time, total_amount')
            .eq('id', existingOrderId)
            .single()
          
          const typedOrder = existingOrder as any
          
          // Check if expired
          if (typedOrder.expiry_time && new Date(typedOrder.expiry_time) < new Date()) {
            console.log('⏰ [API] Existing order expired, creating new one')
            // Continue to create new order
          } else {
            console.log('✅ [API] Reusing existing order to prevent inventory abuse')
            
            // Send email for reused order if not sent before
            const { data: orderDetails } = await supabase
              .from('orders')
              .select('customer_email, order_number, user_id, shipping_address')
              .eq('id', typedOrder.id)
              .single()
            
            const orderData = orderDetails as any
            console.log('📋 [API] Order details for email:', orderData)
            
            if (orderData?.customer_email && orderData?.order_number) {
              // Get customer name from user profile or shipping address
              let customerName = 'Customer'
              
              // Try to get name from users table first
              if (orderData.user_id) {
                console.log('👤 [API] Fetching user data for user_id:', orderData.user_id)
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('first_name, last_name')
                  .eq('id', orderData.user_id)
                  .single()
                
                console.log('👤 [API] User data:', userData)
                console.log('👤 [API] User error:', userError)
                
                if (userData && (userData.first_name || userData.last_name)) {
                  customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
                  console.log('✅ [API] Customer name from users table:', customerName)
                }
              }
              
              // Fallback to shipping address name or email username
              if (customerName === 'Customer') {
                const shippingAddress = orderData.shipping_address || {}
                console.log('📍 [API] Shipping address:', shippingAddress)
                customerName = shippingAddress.full_name || orderData.customer_email.split('@')[0] || 'Customer'
                console.log('⚠️ [API] Using fallback customer name:', customerName)
              }
              
              console.log('📧 [API] Sending order confirmation email for reused order...')
              console.log('📧 [API] Email to:', orderData.customer_email, 'Name:', customerName)
              
              sendOrderConfirmationEmail({
                orderId: typedOrder.id,
                orderNumber: orderData.order_number,
                customerEmail: orderData.customer_email,
                customerName: customerName
              }).catch(error => {
                console.error('❌ [API] Failed to send email (non-blocking):', error)
              })
              
              // Create notification for reused order
              if (orderData.user_id) {
                console.log('🔔 [API] Creating notification for reused order...')
                const { error: notifError } = await supabase.from('notifications').insert({
                  user_id: orderData.user_id,
                  title: 'Order Reminder',
                  message: `Your order #${orderData.order_number} is still pending. Please complete payment to process your order.`,
                  type: 'order',
                  link: `/account/orders/${typedOrder.id}`,
                  read: false
                })
                
                if (notifError) {
                  console.error('❌ [API] Failed to create notification (non-blocking):', notifError)
                } else {
                  console.log('✅ [API] Notification created successfully')
                }
              }
            } else {
              console.warn('⚠️ [API] Cannot send email - missing customer_email or order_number')
            }
            
            return NextResponse.json({
              order_id: typedOrder.id,
              order_number: typedOrder.order_number,
              snap_token: typedOrder.snap_token,
              snap_redirect_url: typedOrder.snap_redirect_url,
              expiry_time: typedOrder.expiry_time,
              total_amount: typedOrder.total_amount,
              is_existing: true,
              message: 'You already have a pending order for these items'
            })
          }
        } else {
          console.log('⚠️ [API] Cart differs from existing order - creating new order')
        }
      }
    }
    
    console.log('📝 [API] Creating new order...')

    // Calculate expiry time (24 hours from now)
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    console.log('📝 [API] Creating new order before payment...')
    const { data: orderId, error: orderError } = await supabase.rpc('create_order_before_payment', {
      p_checkout_session_id: checkout_session_id,
      p_snap_token: snap_token,
      p_snap_redirect_url: snap_redirect_url,
      p_expiry_time: expiryTime
    } as any)

    if (orderError) {
      console.error('❌ [API] Order creation error:', orderError)
      console.error('❌ [API] Error details:', orderError.message, orderError.details, orderError.hint)
      throw orderError
    }
    console.log('✅ [API] Order created successfully, ID:', orderId)

    // Get order details including user_id and shipping_address for customer name
    console.log('📋 [API] Fetching order details for ID:', orderId)
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('order_number, total_amount, customer_email, user_id, shipping_address')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      console.error('❌ [API] Error fetching order details:', fetchError)
      throw new Error(`Failed to fetch order: ${fetchError.message}`)
    }

    if (!order) {
      console.error('❌ [API] Order not found after creation')
      throw new Error('Order not found')
    }

    const typedOrder = order as any
    console.log('📋 [API] Fetched order:', JSON.stringify(typedOrder, null, 2))
    console.log('✅ [API] Order number:', typedOrder?.order_number)
    
    // Generate order_number if missing (fallback)
    let orderNumber = typedOrder.order_number
    if (!orderNumber) {
      console.error('⚠️ [API] Order number is missing! Generating fallback...')
      
      // Generate order number: MYK-YYYYMMDD-XXXX
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const random = Math.random().toString(36).substring(2, 6).toUpperCase()
      orderNumber = `MYK-${date}-${random}`
      
      console.log('🔧 [API] Generated order number:', orderNumber)
      
      // Update the order with the generated number
      const { error: updateError } = await supabase
        .from('orders')
        .update({ order_number: orderNumber })
        .eq('id', orderId)
      
      if (updateError) {
        console.error('❌ [API] Failed to update order_number:', updateError)
      } else {
        console.log('✅ [API] Order number updated successfully')
      }
    }

    // Send order confirmation email
    if (typedOrder?.customer_email && orderNumber) {
      // Get customer name from user profile or shipping address
      let customerName = 'Customer'
      
      // Try to get name from users table first
      if (typedOrder.user_id) {
        console.log('👤 [API] Fetching user data for user_id:', typedOrder.user_id)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', typedOrder.user_id)
          .single()
        
        console.log('👤 [API] User data:', userData)
        console.log('👤 [API] User error:', userError)
        
        if (userData && (userData.first_name || userData.last_name)) {
          customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
          console.log('✅ [API] Customer name from users table:', customerName)
        }
      }
      
      // Fallback to shipping address name or email username
      if (customerName === 'Customer') {
        const shippingAddress = typedOrder.shipping_address || {}
        console.log('📍 [API] Shipping address:', shippingAddress)
        customerName = shippingAddress.name || typedOrder.customer_email.split('@')[0] || 'Customer'
        console.log('⚠️ [API] Using fallback customer name:', customerName)
      }
      
      console.log('📧 [API] Sending order confirmation email...')
      console.log('📧 [API] To:', typedOrder.customer_email, 'Name:', customerName, 'Order:', orderNumber)
      
      sendOrderConfirmationEmail({
        orderId: orderId,
        orderNumber: orderNumber,
        customerEmail: typedOrder.customer_email,
        customerName: customerName
      }).catch(error => {
        console.error('❌ [API] Failed to send email (non-blocking):', error)
      })
      
      // Create notification for order placement (for both authenticated and guest users)
      console.log('🔔 [API] Creating notification for order placement...')
      const notificationData: any = {
        title: 'Order Placed Successfully',
        message: `Your order #${orderNumber} has been placed. Please complete payment to process your order.`,
        type: 'order',
        link: typedOrder.user_id ? `/account/orders/${orderId}` : `/track-order`,
        read: false
      }
      
      // Add user_id for authenticated users, order_id and email for guests
      if (typedOrder.user_id) {
        notificationData.user_id = typedOrder.user_id
        console.log('🔔 [API] Creating notification for authenticated user:', typedOrder.user_id)
      } else {
        notificationData.order_id = orderId
        notificationData.customer_email = typedOrder.customer_email
        console.log('🔔 [API] Creating notification for guest user:', typedOrder.customer_email)
      }
      
      const { error: notifError } = await supabase.from('notifications').insert(notificationData)
      
      if (notifError) {
        console.error('❌ [API] Failed to create notification (non-blocking):', notifError)
      } else {
        console.log('✅ [API] Notification created successfully')
      }
    } else {
      console.warn('⚠️ [API] Cannot send email - missing customer_email or order_number')
    }

    console.log('✅ [API] Order created before payment successfully')
    return NextResponse.json({
      order_id: orderId,
      order_number: orderNumber,
      snap_token: snap_token,
      snap_redirect_url: snap_redirect_url,
      expiry_time: expiryTime,
      total_amount: typedOrder?.total_amount,
      is_existing: false
    })
  } catch (error: any) {
    console.error('❌ [API] Create order before payment error:', error)
    console.error('❌ [API] Error details:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}
