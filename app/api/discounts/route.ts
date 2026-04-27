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
        discount_products(
          id,
          product_id,
          variant_id,
          products(
            id,
            name,
            image_urls
          )
        )
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

      // Get unique products with their details
      const uniqueProducts = new Map()
      discount.discount_products?.forEach((dp: any) => {
        if (dp.products && !uniqueProducts.has(dp.product_id)) {
          // Filter out placeholder images
          const validUrls = dp.products.image_urls?.filter((url: string) => url && url.startsWith('http') && !url.includes('placehold.co')) || []
          uniqueProducts.set(dp.product_id, {
            id: dp.products.id,
            name: dp.products.name,
            image_url: validUrls[0] || null
          })
        }
      })

      return {
        ...discount,
        status,
        is_active: discount.is_active ?? true,
        product_count: discount.discount_products?.length || 0,
        products: Array.from(uniqueProducts.values())
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
    
    console.log('🔵 API: Received discount creation request:', {
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      total_products: body.products?.length || 0
    })

    // Create discount (dates already in UTC from frontend)
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

    if (error) {
      console.error('❌ API: Failed to create discount:', error)
      throw error
    }
    
    console.log('✅ API: Discount created successfully:', {
      discount_id: discount.id,
      name: discount.name
    })

    // Create discount products
    if (body.products && body.products.length > 0) {
      console.log('🔵 API: Creating discount products:', body.products.length)
      
      const discountProducts = body.products.map((product: any, index: number) => {
        const dp = {
          discount_id: discount.id,
          product_id: product.product_id,
          variant_id: product.variant_id || null,
          discount_type: product.discount_type,
          discount_value: product.discount_value,
          discounted_price: product.discounted_price,
          promo_stock: product.promo_stock || null,
          min_purchase: product.min_purchase || null,
          is_active: product.is_active ?? true
        }
        
        console.log(`  📦 Product ${index + 1}:`, {
          product_id: dp.product_id,
          variant_id: dp.variant_id,
          original_price: product.original_price,
          discounted_price: dp.discounted_price,
          discount_value: dp.discount_value,
          discount_type: dp.discount_type,
          discount_percent: product.original_price > 0 ? Math.round(((product.original_price - dp.discounted_price) / product.original_price) * 100) : 0
        })
        
        return dp
      })

      const { data: insertedProducts, error: productsError } = await supabase
        .from('discount_products')
        .insert(discountProducts)
        .select()

      if (productsError) {
        console.error('❌ API: Failed to create discount products:', productsError)
        throw productsError
      }
      
      console.log('✅ API: Discount products created successfully:', insertedProducts?.length || 0)
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
