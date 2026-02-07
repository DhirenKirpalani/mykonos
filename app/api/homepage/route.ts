import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get homepage content (banners, featured collections, featured products)
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    // Fetch active banners
    const { data: banners, error: bannersError } = await supabase
      .from('homepage_banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (bannersError) throw bannersError

    // Fetch featured collections with collection details
    const { data: featuredCollections, error: collectionsError } = await supabase
      .from('featured_collections')
      .select(`
        *,
        collection:collections(*)
      `)
      .eq('is_active', true)
      .order('display_order')

    if (collectionsError) throw collectionsError

    // Fetch featured products with product details
    const { data: featuredProducts, error: productsError } = await supabase
      .from('featured_products')
      .select(`
        *,
        product:products(*)
      `)
      .eq('is_active', true)
      .order('display_order')

    if (productsError) throw productsError

    return NextResponse.json({
      banners: banners || [],
      featured_collections: featuredCollections || [],
      featured_products: featuredProducts || [],
    })
  } catch (error: any) {
    console.error('Homepage content error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch homepage content' },
      { status: 500 }
    )
  }
}
