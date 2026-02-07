import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get product by slug
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { slug } = params

    // Get product
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Get regional pricing if available
    const { searchParams } = new URL(request.url)
    const regionCode = searchParams.get('region')

    let regionalPricing = null
    if (regionCode) {
      const { data: region } = await supabase
        .from('regions')
        .select('id')
        .eq('code', regionCode)
        .single()

      if (region) {
        const { data: pricing } = await supabase
          .from('product_regional_pricing')
          .select('*')
          .eq('product_id', (product as any).id)
          .eq('region_id', (region as any).id)
          .single()

        regionalPricing = pricing
      }
    }

    return NextResponse.json({
      product,
      regional_pricing: regionalPricing,
    })
  } catch (error: any) {
    console.error('Product fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
