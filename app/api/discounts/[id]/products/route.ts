import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Get detailed discount products for a specific discount campaign
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const discountId = params.id

    // Fetch discount products with product details
    const { data: discountProducts, error } = await supabase
      .from('discount_products')
      .select(`
        *,
        products!inner(
          id,
          name,
          image_urls,
          variants
        )
      `)
      .eq('discount_id', discountId)

    if (error) {
      console.error('Error fetching discount products:', error)
      throw error
    }

    // Transform data to include product details and calculate original price
    const enrichedProducts = discountProducts.map((dp: any) => {
      const product = dp.products
      let originalPrice = 0
      let stock = 0

      // If variant_id exists, find the variant details
      if (dp.variant_id && product.variants) {
        const variant = product.variants.find((v: any) => v.name === dp.variant_id)
        if (variant) {
          originalPrice = variant.price_idr || 0
          stock = variant.stock_quantity || 0
        }
      } else {
        // No variant, use product price
        originalPrice = product.price_idr || 0
        stock = product.stock_quantity || 0
      }

      return {
        id: dp.id,
        product_id: dp.product_id,
        product_name: product.name,
        product_image: product.image_urls?.[0] || null,
        variant_id: dp.variant_id,
        variant_name: dp.variant_id || null,
        original_price: originalPrice,
        discounted_price: dp.discounted_price,
        discount_value: dp.discount_value,
        discount_type: dp.discount_type,
        stock: stock,
        promo_stock: dp.promo_stock,
        min_purchase: dp.min_purchase,
        is_active: dp.is_active
      }
    })

    return NextResponse.json(enrichedProducts)
  } catch (error: any) {
    console.error('Error in GET /api/discounts/[id]/products:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
