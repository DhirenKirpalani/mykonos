import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.toLowerCase().trim()
    const orderNumber = searchParams.get('order_number')?.toUpperCase().trim()

    if (!email || !orderNumber) {
      return NextResponse.json(
        { error: 'Email and order number are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        customer_email,
        shipping_address,
        total_amount,
        currency_code,
        created_at,
        completed_at,
        carrier_code,
        tracking_number,
        estimated_delivery_date,
        snap_token,
        stripe_session_id,
        stripe_payment_intent_id,
        expiry_time,
        payment_method_type,
        payment_gateway,
        payment_metadata,
        packed_at,
        shipped_at,
        subtotal_amount,
        discount_amount,
        shipping_amount,
        tax_amount,
        order_items (
          id,
          product_id,
          quantity,
          price_at_purchase,
          variant_name,
          product:products (
            name,
            image_urls,
            variants
          )
        )
      `)
      .eq('customer_email', email)
      .eq('order_number', orderNumber)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order: data })
  } catch (error: any) {
    console.error('❌ [API] Track order error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
