import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Duplicate a discount
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { id } = params

    // Fetch the original discount with its products
    const { data: originalDiscount, error: fetchError } = await supabase
      .from('discounts')
      .select('*, discount_products(*)')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Create new discount with copied data
    const { data: newDiscount, error: createError } = await supabase
      .from('discounts')
      .insert({
        name: `${originalDiscount.name} (Copy)`,
        start_date: originalDiscount.start_date,
        end_date: originalDiscount.end_date,
        is_active: false // Set to inactive by default
      })
      .select()
      .single()

    if (createError) throw createError

    // Copy discount products
    if (originalDiscount.discount_products && originalDiscount.discount_products.length > 0) {
      const discountProducts = originalDiscount.discount_products.map((product: any) => ({
        discount_id: newDiscount.id,
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

    return NextResponse.json({
      message: 'Discount duplicated successfully',
      discount: newDiscount
    })
  } catch (error: any) {
    console.error('Error duplicating discount:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
