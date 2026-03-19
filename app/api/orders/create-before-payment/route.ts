import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

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

    // Get order details
    console.log('📋 [API] Fetching order details...')
    const { data: order } = await supabase
      .from('orders')
      .select('order_number, total_amount')
      .eq('id', orderId)
      .single()

    const typedOrder = order as any
    console.log('✅ [API] Order number:', typedOrder?.order_number)

    console.log('✅ [API] Order created before payment successfully')
    return NextResponse.json({
      order_id: orderId,
      order_number: typedOrder?.order_number,
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
