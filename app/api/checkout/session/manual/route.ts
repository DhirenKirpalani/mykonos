import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Create checkout session manually with provided cart and pricing data
 * Used for Buy Now flow where items aren't in the cart
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { 
      user_id, 
      session_id,
      currency_code,
      region_code,
      customer_email,
      guest_shipping_address,
      cart_snapshot: providedCartSnapshot,
      pricing_snapshot: providedPricingSnapshot
    } = body

    // Either user_id or session_id must be provided
    if (!user_id && !session_id) {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    let cart_snapshot = providedCartSnapshot
    let pricing_snapshot = providedPricingSnapshot

    // If cart_snapshot not provided, fetch from database
    if (!cart_snapshot) {
      let cartQuery = supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          variant_name,
          variant_sku,
          price_at_add,
          products (
            id,
            name,
            price_usd,
            price_idr,
            stock_quantity,
            variants
          )
        `)

      if (user_id) {
        cartQuery = cartQuery.eq('user_id', user_id)
      } else {
        cartQuery = cartQuery.eq('session_id', session_id)
      }

      const { data: cartItems, error: cartError } = await cartQuery

      if (cartError) {
        return NextResponse.json(
          { error: 'Failed to fetch cart items' },
          { status: 500 }
        )
      }

      if (!cartItems || cartItems.length === 0) {
        return NextResponse.json(
          { error: 'Cart is empty' },
          { status: 400 }
        )
      }

      // Build cart snapshot
      cart_snapshot = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: (item as any).price_at_add,
        variant_name: (item as any).variant_name || null,
        variant_sku: (item as any).variant_sku || null,
      }))

      // Calculate pricing if not provided
      if (!pricing_snapshot) {
        const subtotal = cartItems.reduce((sum, item) => {
          const product = item.products as any
          const price = region_code === 'ID' ? product.price_idr : product.price_usd
          return sum + (price * item.quantity)
        }, 0)

        pricing_snapshot = {
          subtotal,
          shipping: 0,
          tax: subtotal * 0.1,
          total: subtotal + (subtotal * 0.1),
          currency_code: currency_code || (region_code === 'ID' ? 'IDR' : 'USD')
        }
      }
    }

    // Validate we have cart data
    if (!cart_snapshot || !pricing_snapshot) {
      return NextResponse.json(
        { error: 'Cart snapshot and pricing snapshot required' },
        { status: 400 }
      )
    }

    const { data: checkoutSession, error: sessionError } = await supabase
      .from('checkout_sessions')
      .insert({
        user_id: user_id || null,
        session_id: session_id || null,
        current_step: 1,
        cart_snapshot: cart_snapshot as any,
        pricing_snapshot: pricing_snapshot as any,
        customer_email: customer_email || null,
        guest_shipping_address: guest_shipping_address || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } as any)
      .select()
      .single()

    if (sessionError) throw sessionError

    const typedSession = checkoutSession as any

    // NOTE: Inventory reservation now happens when order is created (via create_order_before_payment)
    // not at checkout session creation time. This is part of the order-first architecture.
    // The reserve_inventory_for_order function is called after order creation.

    return NextResponse.json({
      session_id: typedSession.id,
      expires_at: typedSession.expires_at
    })
  } catch (error: any) {
    console.error('Create manual checkout session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
