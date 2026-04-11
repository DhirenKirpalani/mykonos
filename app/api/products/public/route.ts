import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Cache for 60 seconds

/**
 * Optimized public products API with pagination and caching
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const collection = searchParams.get('collection')
    const gender = searchParams.get('gender')
    const sale = searchParams.get('sale')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'newest'
    const offset = (page - 1) * limit

    // Build query with only essential fields
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        price_idr,
        price_usd,
        compare_at_price_idr,
        compare_at_price_usd,
        stock_quantity,
        images,
        fragrance_family,
        gender,
        is_new_manual,
        is_best_selling,
        is_popular,
        created_at
      `, { count: 'exact' })
      .eq('is_visible', true)

    // Apply filters
    if (category) {
      query = query.eq('fragrance_family', category)
    }
    if (collection) {
      query = query.eq('collection_id', collection)
    }
    if (gender && gender !== 'all') {
      query = query.eq('gender', gender)
    }
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Apply sorting
    switch (sort) {
      case 'price_asc':
        query = query.order('price_idr', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price_idr', { ascending: false })
        break
      case 'name_asc':
        query = query.order('name', { ascending: true })
        break
      case 'name_desc':
        query = query.order('name', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Separate in-stock and sold-out products
    const [inStockResult, soldOutResult] = await Promise.all([
      query
        .gt('stock_quantity', 0)
        .range(offset, offset + limit - 1),
      sale === 'true' ? { data: [], count: 0 } : query
        .eq('stock_quantity', 0)
        .limit(4)
    ])

    if (inStockResult.error) throw inStockResult.error

    // Fetch active vouchers and discounts in parallel
    const now = new Date().toISOString()
    const [vouchersResult, discountsResult] = await Promise.all([
      supabase
        .from('promo_codes')
        .select('discount_type, discount_value, scope, applicable_product_ids')
        .eq('is_active', true)
        .lte('valid_from', now)
        .gte('valid_until', now),
      supabase
        .from('discount_products')
        .select(`
          product_id,
          discounted_price,
          discounts!inner(is_active, start_date, end_date)
        `)
        .eq('is_active', true)
        .eq('discounts.is_active', true)
        .lte('discounts.start_date', now)
        .gte('discounts.end_date', now)
    ])

    // Build voucher map
    const voucherMap = new Map()
    if (vouchersResult.data) {
      vouchersResult.data.forEach(voucher => {
        if (voucher.scope === 'all') {
          voucherMap.set('__all__', {
            discount_type: voucher.discount_type,
            discount_value: voucher.discount_value
          })
        } else if (voucher.scope === 'specific_products' && voucher.applicable_product_ids) {
          voucher.applicable_product_ids.forEach((productId: string) => {
            voucherMap.set(productId, {
              discount_type: voucher.discount_type,
              discount_value: voucher.discount_value
            })
          })
        }
      })
    }

    // Build discount map
    const discountMap = new Map()
    if (discountsResult.data) {
      discountsResult.data.forEach(discount => {
        const existing = discountMap.get(discount.product_id)
        if (!existing || discount.discounted_price < existing.discounted_price) {
          discountMap.set(discount.product_id, {
            discounted_price: discount.discounted_price
          })
        }
      })
    }

    // Attach discounts to products
    const productsWithDiscounts = (inStockResult.data || []).map(product => ({
      ...product,
      voucher: voucherMap.get(product.id) || voucherMap.get('__all__') || null,
      discount: discountMap.get(product.id) || null
    }))

    const soldOutWithDiscounts = (soldOutResult.data || []).map(product => ({
      ...product,
      voucher: voucherMap.get(product.id) || voucherMap.get('__all__') || null,
      discount: discountMap.get(product.id) || null
    }))

    return NextResponse.json({
      products: productsWithDiscounts,
      soldOutProducts: soldOutWithDiscounts,
      total: inStockResult.count || 0,
      page,
      limit,
      totalPages: Math.ceil((inStockResult.count || 0) / limit)
    })
  } catch (error: any) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
