import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(request: Request) {
  try {
    console.log('🔵 [API] POST /api/checkout/session - Creating checkout session')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { user_id, session_id, items, currency_code, region_code, voucher_discount = 0, item_discounts = [] } = body
    
    console.log('📥 [API] Request body:', { user_id, session_id, items_count: items?.length, currency_code, region_code })

    if (!user_id && !session_id) {
      console.error('❌ [API] Missing user_id and session_id')
      return NextResponse.json(
        { error: 'User ID or session ID required' },
        { status: 400 }
      )
    }

    // Get region currency if not provided
    let finalCurrencyCode = currency_code
    if (!finalCurrencyCode && region_code) {
      const { data: region } = await supabase
        .from('regions')
        .select('currency_code')
        .eq('code', region_code)
        .single()
      
      finalCurrencyCode = region?.currency_code || 'IDR'
    }
    if (!finalCurrencyCode) {
      finalCurrencyCode = 'IDR' // Default to IDR for Indonesia
    }

    let cartSnapshot: Array<{ product_id: string; quantity: number; price: number | null; variant_name?: string | null; variant_sku?: string | null }> = []
    let subtotal = 0

    // If items are provided directly (Buy Now flow), use them
    if (items && Array.isArray(items) && items.length > 0) {
      console.log('🎯 [API] Using provided items (Buy Now flow):', items.length)
      cartSnapshot = items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        variant_name: item.variant_name || null,
        variant_sku: item.variant_sku || null,
      }))
      subtotal = items.reduce((sum: number, item: any) => sum + ((item.price || 0) * item.quantity), 0)
      console.log('💰 [API] Calculated subtotal:', subtotal)
    } else {
      console.log('🛒 [API] Fetching items from cart_items table')
      // Otherwise, fetch from cart_items table
      let cartQuery = supabase
        .from('cart_items')
        .select('product_id, quantity, price_at_add, variant_name, variant_sku')
      
      if (user_id) {
        cartQuery = cartQuery.eq('user_id', user_id)
      } else if (session_id) {
        cartQuery = cartQuery.eq('session_id', session_id)
      }

      const { data: cartItems, error: cartError } = await cartQuery

      if (cartError) {
        console.error('❌ [API] Cart fetch error:', cartError)
        throw cartError
      }

      if (!cartItems || cartItems.length === 0) {
        console.error('❌ [API] No cart items found for user_id:', user_id, 'session_id:', session_id)
        return NextResponse.json(
          { error: 'Cart is empty' },
          { status: 400 }
        )
      }
      
      console.log('✅ [API] Found cart items:', cartItems.length)

      const typedCartItems = cartItems as Array<{
        product_id: string
        quantity: number
        price_at_add: number | null
        variant_name?: string | null
        variant_sku?: string | null
      }>

      cartSnapshot = typedCartItems.map(item => {
        // Use campaign-discounted price if provided, otherwise fall back to price_at_add
        const discountEntry = (item_discounts as Array<{ product_id: string; variant_name: string | null; discounted_price: number }>)
          .find(d =>
            d.product_id === item.product_id &&
            (d.variant_name === item.variant_name || (!d.variant_name && !item.variant_name))
          )
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          price: discountEntry?.discounted_price ?? item.price_at_add,
          variant_name: item.variant_name || null,
          variant_sku: item.variant_sku || null,
        }
      })

      subtotal = cartSnapshot.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0)
      console.log('💰 [API] Calculated subtotal from cart:', subtotal)
    }

    const pricingSnapshot = {
      subtotal,
      discount: voucher_discount,
      shipping: 0,
      tax: (subtotal - voucher_discount) * 0.1,
      total: (subtotal - voucher_discount) + ((subtotal - voucher_discount) * 0.1),
      currency_code: finalCurrencyCode
    }

    console.log('📝 [API] Creating checkout session in database...')
    console.log('📋 [API] Pricing snapshot:', pricingSnapshot)
    const { data: checkoutSession, error: sessionError } = await supabase
      .from('checkout_sessions')
      .insert({
        user_id: user_id || null,
        session_id: session_id || null,
        current_step: 1,
        cart_snapshot: cartSnapshot as any,
        pricing_snapshot: pricingSnapshot as any,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } as any)
      .select()
      .single()

    if (sessionError) {
      console.error('❌ [API] Failed to create checkout session:', sessionError)
      throw sessionError
    }
    console.log('✅ [API] Checkout session created:', (checkoutSession as any)?.id)

    const typedSession = checkoutSession as any

    // NOTE: Inventory reservation now happens when order is created (via create_order_before_payment)
    // not at checkout session creation time. This is part of the order-first architecture.
    // The reserve_inventory_for_order function is called after order creation.

    console.log('✅ [API] Checkout session created successfully')
    return NextResponse.json({
      session_id: typedSession.id,
      expires_at: typedSession.expires_at
    })
  } catch (error: any) {
    console.error('❌ [API] Create checkout session error:', error)
    console.error('❌ [API] Error details:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    console.log('🔵 [API] PATCH /api/checkout/session - Updating checkout session')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { 
      session_id, 
      current_step, 
      customer_email, 
      shipping_address_id, 
      shipping_method_id,
      payment_method_type,
      new_address 
    } = body
    
    console.log('📥 [API] Update request:', { session_id, current_step, customer_email, shipping_address_id })

    if (!session_id) {
      console.error('❌ [API] Missing session_id')
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    let addressId = shipping_address_id
    let guestAddressData = null

    if (new_address && !shipping_address_id) {
      const { data: session } = await supabase
        .from('checkout_sessions')
        .select('user_id, session_id')
        .eq('id', session_id)
        .single()

      const typedSession = session as any

      // For authenticated users, save to shipping_addresses table
      if (typedSession?.user_id) {
        const { data: newAddr, error: addrError } = await supabase
          .from('shipping_addresses')
          .insert({
            user_id: typedSession.user_id,
            full_name: new_address.full_name,
            phone: new_address.phone,
            address_line1: new_address.address_line1,
            address_line2: new_address.address_line2 || null,
            city: new_address.city,
            state_province: new_address.state_province,
            postal_code: new_address.postal_code,
            country: new_address.country,
            is_default: false
          } as any)
          .select()
          .single()

        if (addrError) throw addrError
        const typedAddr = newAddr as any
        addressId = typedAddr.id
      } else {
        // For anonymous/guest users, store address data in checkout session
        guestAddressData = {
          full_name: new_address.full_name,
          phone: new_address.phone,
          address_line1: new_address.address_line1,
          address_line2: new_address.address_line2 || null,
          city: new_address.city,
          state_province: new_address.state_province,
          postal_code: new_address.postal_code,
          country: new_address.country
        }
      }
    }

    const updateData: any = {}
    if (current_step) updateData.current_step = current_step
    if (customer_email) updateData.customer_email = customer_email
    if (addressId) updateData.shipping_address_id = addressId
    if (guestAddressData) updateData.guest_shipping_address = guestAddressData
    if (shipping_method_id) updateData.shipping_method_id = shipping_method_id
    if (payment_method_type) updateData.payment_method_type = payment_method_type
    updateData.updated_at = new Date().toISOString()

    console.log('📝 [API] Updating checkout session with data:', updateData)
    const { error: updateError } = await supabase
      .from('checkout_sessions')
      .update(updateData as any)
      .eq('id', session_id)

    if (updateError) {
      console.error('❌ [API] Failed to update session:', updateError)
      throw updateError
    }
    console.log('✅ [API] Checkout session updated successfully')

    if (shipping_method_id) {
      const { data: method } = await supabase
        .from('shipping_methods')
        .select('base_cost')
        .eq('id', shipping_method_id)
        .single()

      const typedMethod = method as any

      if (typedMethod) {
        const { data: session } = await supabase
          .from('checkout_sessions')
          .select('pricing_snapshot')
          .eq('id', session_id)
          .single()

        const typedSession = session as any

        if (typedSession?.pricing_snapshot) {
          const pricing = typedSession.pricing_snapshot as any
          pricing.shipping = typedMethod.base_cost
          pricing.total = pricing.subtotal - pricing.discount + pricing.shipping + pricing.tax

          await supabase
            .from('checkout_sessions')
            .update({ pricing_snapshot: pricing } as any)
            .eq('id', session_id)
        }
      }
    }

    console.log('✅ [API] Session update complete')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ [API] Update checkout session error:', error)
    console.error('❌ [API] Error details:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to update checkout session' },
      { status: 500 }
    )
  }
}
