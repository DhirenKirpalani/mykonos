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
      let productImage = null

      // Helper: resolve a possibly-relative Supabase storage path to a full public URL
      const resolveImageUrl = (url: string | null | undefined): string | null => {
        if (!url || url.trim() === '') return null
        if (url.startsWith('http://') || url.startsWith('https://')) return url
        // Relative path — prepend the Supabase project URL
        const base = supabaseUrl.replace(/\/$/, '')
        const path = url.startsWith('/') ? url : `/storage/v1/object/public/${url}`
        return `${base}${path}`
      }

      // If variant_id exists, find the variant details
      if (dp.variant_id && product.variants) {
        const variant = product.variants.find((v: any) => v.name === dp.variant_id)
        if (variant) {
          originalPrice = variant.price_idr || 0
          stock = variant.stock_quantity || 0
          productImage = resolveImageUrl(variant.image_url)
        }
      } else {
        // No variant, use product price
        originalPrice = product.price_idr || 0
        stock = product.stock_quantity || 0
      }

      // Fall back to product.image_urls if no variant image resolved
      if (!productImage) {
        const validUrls = (product.image_urls || [])
          .map((url: string) => resolveImageUrl(url))
          .filter((url: string | null) => url && !url.includes('placehold.co'))
        productImage = validUrls[0] || null
      }

      return {
        id: dp.id,
        product_id: dp.product_id,
        product_name: product.name,
        product_image: productImage,
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
