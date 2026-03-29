import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Get all discounts
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: discounts, error } = await supabase
      .from('discounts')
      .select(`
        *,
        discount_products(count)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate status and product count for each discount
    const enrichedDiscounts = discounts?.map(discount => {
      const now = new Date()
      const startDate = new Date(discount.start_date)
      const endDate = new Date(discount.end_date)
      
      let status = 'active'
      if (now < startDate) {
        status = 'scheduled'
      } else if (now > endDate) {
        status = 'expired'
      }

      return {
        ...discount,
        status,
        product_count: discount.discount_products?.[0]?.count || 0
      }
    }) || []

    return NextResponse.json(enrichedDiscounts)
  } catch (error: any) {
    console.error('Error fetching discounts:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Create new discount
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json()

    // Create discount
    const { data: discount, error } = await supabase
      .from('discounts')
      .insert({
        name: body.name,
        start_date: body.start_date,
        end_date: body.end_date,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    // Create discount products
    if (body.products && body.products.length > 0) {
      const discountProducts = body.products.map((product: any) => ({
        discount_id: discount.id,
        product_id: product.product_id,
        variant_id: product.variant_id,
        discount_type: product.discount_type,
        discount_value: product.discount_value,
        discounted_price: product.discounted_price,
        promo_stock: product.promo_stock,
        min_purchase: product.min_purchase,
        is_active: product.is_active
      }))

      const { error: productsError } = await supabase
        .from('discount_products')
        .insert(discountProducts)

      if (productsError) throw productsError
    }

    return NextResponse.json(discount)
  } catch (error: any) {
    console.error('Error creating discount:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
