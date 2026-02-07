import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Get products with filtering and sorting
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '12')
    const offset = (page - 1) * perPage

    // Filters
    const collection = searchParams.get('collection')
    const fragranceFamily = searchParams.get('fragrance_family')
    const priceMin = searchParams.get('price_min')
    const priceMax = searchParams.get('price_max')
    const inStock = searchParams.get('in_stock')
    const search = searchParams.get('search')
    
    // Sorting
    const sort = searchParams.get('sort') || 'editorial' // editorial, price-asc, price-desc, new-arrivals

    // Build query
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })

    // Apply filters
    if (collection) {
      query = query.eq('collection', collection)
    }

    if (fragranceFamily) {
      query = query.eq('fragrance_family', fragranceFamily)
    }

    if (priceMin) {
      query = query.gte('price', parseFloat(priceMin))
    }

    if (priceMax) {
      query = query.lte('price', parseFloat(priceMax))
    }

    if (inStock === 'true') {
      query = query.gt('stock_quantity', 0)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply sorting
    switch (sort) {
      case 'price-asc':
        query = query.order('price', { ascending: true })
        break
      case 'price-desc':
        query = query.order('price', { ascending: false })
        break
      case 'new-arrivals':
        query = query.order('created_at', { ascending: false })
        break
      case 'editorial':
      default:
        query = query.order('editorial_priority', { ascending: false })
        break
    }

    // Apply pagination
    query = query.range(offset, offset + perPage - 1)

    const { data: products, error, count } = await query

    if (error) throw error

    const totalPages = count ? Math.ceil(count / perPage) : 0

    return NextResponse.json({
      products: products || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: totalPages,
    })
  } catch (error: any) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
